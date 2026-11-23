import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { decryptData, encryptData } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { logAudit } from '../utils/audit.js';

export interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  hardSpendLimit: number;
}

export class WhatsAppService {
  /**
   * Get WhatsApp configuration
   */
  async getConfig(): Promise<WhatsAppConfig | null> {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'WHATSAPP_CLOUD' },
    });

    if (integration?.configEncrypted) {
      try {
        return JSON.parse(decryptData(integration.configEncrypted));
      } catch {
        // Fall back to environment
      }
    }

    if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
      return {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'ai_outreach_wh_verify_secret_token',
        appSecret: process.env.WHATSAPP_APP_SECRET || '',
        hardSpendLimit: Number(process.env.WHATSAPP_HARD_SPEND_LIMIT) || 0.0,
      };
    }

    return null;
  }

  /**
   * Save WhatsApp configuration
   */
  async saveConfig(config: WhatsAppConfig, userId?: string) {
    const encrypted = encryptData(JSON.stringify(config));

    await prisma.integration.upsert({
      where: { provider: 'WHATSAPP_CLOUD' },
      update: {
        status: config.phoneNumberId && config.accessToken ? 'CONNECTED' : 'DISCONNECTED',
        configEncrypted: encrypted,
        lastSyncAt: new Date(),
      },
      create: {
        provider: 'WHATSAPP_CLOUD',
        status: config.phoneNumberId && config.accessToken ? 'CONNECTED' : 'DISCONNECTED',
        configEncrypted: encrypted,
      },
    });

    await logAudit({
      userId,
      action: 'UPDATE_CONFIG',
      entityType: 'Integration',
      entityId: 'WHATSAPP_CLOUD',
      details: { phoneNumberId: config.phoneNumberId },
    });
  }

  /**
   * Get WhatsApp integration status
   */
  async getStatus(): Promise<{
    configured: boolean;
    phoneNumberId: string | null;
    hardSpendLimit: number;
    sendingEnabled: boolean;
  }> {
    const config = await this.getConfig();
    const sendSetting = await prisma.systemSetting.findUnique({
      where: { key: 'WHATSAPP_SEND_ENABLED' },
    });

    return {
      configured: !!config?.phoneNumberId && !!config?.accessToken,
      phoneNumberId: config?.phoneNumberId || null,
      hardSpendLimit: config?.hardSpendLimit ?? 0.0,
      sendingEnabled: sendSetting?.value === 'true',
    };
  }

  /**
   * Send WhatsApp template message via official Meta Graph API
   */
  async sendTemplateMessage(params: {
    recipientPhone: string;
    templateName: string;
    languageCode?: string;
    variables: Record<string, string>;
  }): Promise<{ messageId: string; simulated?: boolean }> {
    const config = await this.getConfig();
    const dryRun = (await prisma.systemSetting.findUnique({ where: { key: 'DRY_RUN' } }))?.value === 'true';
    const whatsappEnabled =
      (await prisma.systemSetting.findUnique({ where: { key: 'WHATSAPP_SEND_ENABLED' } }))?.value === 'true';

    // Strictly enforce zero cost / simulated sending when credentials or authorization are absent
    if (dryRun || !whatsappEnabled || !config?.accessToken || !config?.phoneNumberId) {
      logger.info(`WhatsApp simulated delivery for ${params.recipientPhone} (Template: ${params.templateName})`);
      return {
        messageId: `wamid.simulated.${Date.now()}.${Math.floor(Math.random() * 100000)}`,
        simulated: true,
      };
    }

    // Convert variables record to Meta components structure
    const bodyParameters = Object.entries(params.variables).map(([_, val]) => ({
      type: 'text',
      text: String(val),
    }));

    const payload = {
      messaging_product: 'whatsapp',
      to: params.recipientPhone.replace('+', ''),
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode || 'en_US',
        },
        components: [
          {
            type: 'body',
            parameters: bodyParameters,
          },
        ],
      },
    };

    const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Meta WhatsApp API HTTP ${resp.status}: ${errText}`);
    }

    const data: any = await resp.json();
    const msgId = data.messages?.[0]?.id;
    if (!msgId) {
      throw new Error('Meta API did not return message id');
    }

    return { messageId: msgId };
  }

  /**
   * Verify Meta webhook signature (X-Hub-Signature-256)
   */
  verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      // If no secret configured in dev mode, accept token verify
      return true;
    }

    try {
      const signature = signatureHeader.replace('sha256=', '');
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Process incoming webhook event payload from Meta
   */
  async processWebhookEvent(payload: any) {
    if (payload.object !== 'whatsapp_business_account') {
      return;
    }

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value;
        if (!val) continue;

        // 1. Process delivery statuses (sent, delivered, read, failed)
        if (val.statuses) {
          for (const status of val.statuses) {
            const providerMsgId = status.id;
            const eventType = (status.status || '').toUpperCase(); // DELIVERED, READ, FAILED, SENT

            const sendJob = await prisma.sendJob.findFirst({
              where: {
                deliveryEvents: {
                  some: { providerMessageId: providerMsgId },
                },
              },
            });

            if (sendJob) {
              await prisma.deliveryEvent.create({
                data: {
                  sendJobId: sendJob.id,
                  channel: 'WHATSAPP',
                  eventType: eventType === 'SENT' ? 'ACCEPTED' : eventType,
                  providerMessageId: providerMsgId,
                  rawPayload: JSON.stringify(status),
                },
              });
            }
          }
        }

        // 2. Process incoming messages (replies or opt-out requests)
        if (val.messages) {
          for (const msg of val.messages) {
            const fromNumber = `+${msg.from}`;
            const textContent = msg.text?.body || msg.button?.text || '';
            const msgId = msg.id;

            // Find matching lead by phone
            const lead = await prisma.lead.findFirst({
              where: { phone: fromNumber },
            });

            if (!lead) {
              logger.warn(`Received WhatsApp message from unregistered number: ${fromNumber}`);
              continue;
            }

            // Check if client is requesting an opt-out (e.g. STOP, UNSUBSCRIBE)
            const cleanText = textContent.trim().toLowerCase();
            const isOptOut =
              cleanText === 'stop' ||
              cleanText === 'unsubscribe' ||
              cleanText === 'cancel' ||
              cleanText === 'optout';

            if (isOptOut) {
              // Mark lead as opted out & add to suppression list
              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  whatsappOptIn: false,
                  whatsappStatus: 'OPTED_OUT',
                  status: 'UNSUBSCRIBED',
                },
              });

              await prisma.suppressionList.upsert({
                where: { identifier: fromNumber },
                update: { reason: 'OPT_OUT' },
                create: {
                  identifier: fromNumber,
                  channel: 'WHATSAPP',
                  reason: 'OPT_OUT',
                  notes: 'WhatsApp incoming STOP message',
                },
              });

              // Cancel pending follow-ups
              await prisma.followUp.updateMany({
                where: { leadId: lead.id, status: 'SCHEDULED' },
                data: { status: 'CANCELLED_OPTOUT' },
              });

              logger.info(`Lead ${lead.companyName} opted out via WhatsApp`);
              continue;
            }

            // Record conversation and message
            const conversation = await prisma.conversation.upsert({
              where: {
                leadId_channel: {
                  leadId: lead.id,
                  channel: 'WHATSAPP',
                },
              },
              update: {
                status: 'REPLIED',
                lastMessageAt: new Date(),
              },
              create: {
                leadId: lead.id,
                channel: 'WHATSAPP',
                threadId: fromNumber,
                subject: `WhatsApp Conversation with ${lead.companyName}`,
                status: 'REPLIED',
              },
            });

            await prisma.conversationMessage.create({
              data: {
                conversationId: conversation.id,
                direction: 'INBOUND',
                sender: fromNumber,
                recipient: val.metadata?.display_phone_number || 'Agency WhatsApp',
                content: textContent,
                providerMessageId: msgId,
              },
            });

            // Update lead status to REPLIED
            await prisma.lead.update({
              where: { id: lead.id },
              data: { status: 'REPLIED' },
            });

            // Cancel scheduled follow-ups automatically upon reply
            await prisma.followUp.updateMany({
              where: { leadId: lead.id, status: 'SCHEDULED' },
              data: { status: 'CANCELLED_REPLY' },
            });

            await logAudit({
              action: 'WHATSAPP_REPLY_RECEIVED',
              entityType: 'Lead',
              entityId: lead.id,
              details: { from: fromNumber, textSnippet: textContent.substring(0, 50) },
            });
          }
        }
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
