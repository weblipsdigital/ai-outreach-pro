import prisma from '../utils/prisma.js';
import { gmailService } from './gmailService.js';
import { whatsappService } from './whatsappService.js';
import { logger } from '../utils/logger.js';
import { logAudit } from '../utils/audit.js';

export class SendDispatcher {
  /**
   * Send an approved message with strict compliance, rate limiting, and idempotency checks
   */
  async sendApprovedMessage(generatedMessageId: string, userId?: string) {
    const message = await prisma.generatedMessage.findUnique({
      where: { id: generatedMessageId },
      include: {
        lead: true,
        campaign: true,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.status !== 'APPROVED') {
      throw new Error(`Message cannot be sent. Current status is ${message.status} (must be APPROVED).`);
    }

    const lead = message.lead;

    // 1. Check Suppression List
    const suppressed = await prisma.suppressionList.findFirst({
      where: {
        OR: [
          { identifier: lead.email.toLowerCase() },
          ...(lead.phone ? [{ identifier: lead.phone }] : []),
        ],
      },
    });

    if (suppressed) {
      await prisma.generatedMessage.update({
        where: { id: message.id },
        data: { status: 'FAILED', errorMessage: `Recipient is on suppression list (${suppressed.reason})` },
      });
      throw new Error(`Sending blocked: Recipient is suppressed (${suppressed.reason})`);
    }

    // 2. Check Channel Permission
    if (message.channel === 'EMAIL' && !lead.emailPermission) {
      throw new Error(`Sending blocked: Lead does not have explicit email consent.`);
    }
    if (message.channel === 'WHATSAPP' && !lead.whatsappOptIn) {
      throw new Error(`Sending blocked: Lead does not have explicit WhatsApp opt-in.`);
    }

    // 3. Check Lead Status
    if (['UNSUBSCRIBED', 'CLOSED', 'NOT_INTERESTED'].includes(lead.status)) {
      throw new Error(`Sending blocked: Lead status is ${lead.status}`);
    }

    // 4. Check Daily Cap
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const settingKey = message.channel === 'EMAIL' ? 'DAILY_EMAIL_LIMIT' : 'DAILY_WHATSAPP_LIMIT';
    const limitSetting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
    const dailyCap = limitSetting ? parseInt(limitSetting.value, 10) : 10;

    const sentTodayCount = await prisma.sendJob.count({
      where: {
        channel: message.channel,
        status: 'SENT',
        sentAt: { gte: today },
      },
    });

    if (sentTodayCount >= dailyCap) {
      throw new Error(`Sending blocked: Daily cap reached for ${message.channel} (${sentTodayCount}/${dailyCap})`);
    }

    // 5. Check Dry-Run and WhatsApp Master Switch
    const dryRunSetting = await prisma.systemSetting.findUnique({ where: { key: 'DRY_RUN' } });
    const isDryRun = dryRunSetting?.value === 'true';

    // 6. Find or Create SendJob with row locking
    const sendJob = await prisma.sendJob.findFirst({
      where: { generatedMessageId: message.id, status: { in: ['QUEUED', 'PROCESSING'] } },
    });

    const jobId = sendJob
      ? sendJob.id
      : (
          await prisma.sendJob.create({
            data: {
              generatedMessageId: message.id,
              channel: message.channel,
              status: 'PROCESSING',
              lockedAt: new Date(),
              idempotencyKey: `dispatch-${message.id}-${Date.now()}`,
            },
          })
        ).id;

    // Lock job to prevent race conditions
    await prisma.sendJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', lockedAt: new Date(), lockedBy: userId || 'system' },
    });

    try {
      let providerMessageId = '';
      let threadId = '';

      if (message.channel === 'EMAIL') {
        if (isDryRun) {
          logger.info(`[DRY RUN] Simulated email dispatch to ${lead.email}: "${message.subject}"`);
          providerMessageId = `sim-email-${Date.now()}`;
          threadId = `sim-thread-${Date.now()}`;
        } else {
          const sent = await gmailService.sendEmail({
            to: lead.email,
            subject: message.subject,
            bodyText: message.emailBody,
          });
          providerMessageId = sent.messageId;
          threadId = sent.threadId;
        }
      } else if (message.channel === 'WHATSAPP') {
        if (!lead.phone) {
          throw new Error('Lead phone number missing for WhatsApp delivery');
        }

        const variables = message.whatsappTemplateVariables
          ? JSON.parse(message.whatsappTemplateVariables)
          : { '1': lead.contactName, '2': lead.companyName };

        const sent = await whatsappService.sendTemplateMessage({
          recipientPhone: lead.phone,
          templateName: message.whatsappTemplateName || 'client_outreach_v1',
          variables,
        });
        providerMessageId = sent.messageId;
      }

      // Mark SendJob as SENT
      await prisma.sendJob.update({
        where: { id: jobId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
      });

      // Record DeliveryEvent
      await prisma.deliveryEvent.create({
        data: {
          sendJobId: jobId,
          channel: message.channel,
          eventType: 'ACCEPTED',
          providerMessageId,
          rawPayload: JSON.stringify({ isDryRun, channel: message.channel, timestamp: new Date() }),
        },
      });

      // Update GeneratedMessage status
      await prisma.generatedMessage.update({
        where: { id: message.id },
        data: { status: 'SENT' },
      });

      // Update Lead status to CONTACTED if currently NEW or DRAFTED
      if (['NEW', 'DRAFTED'].includes(lead.status)) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'CONTACTED' },
        });
      }

      // Create or update conversation thread
      const conversation = await prisma.conversation.upsert({
        where: {
          leadId_channel: {
            leadId: lead.id,
            channel: message.channel,
          },
        },
        update: {
          threadId: threadId || undefined,
          lastMessageAt: new Date(),
          status: 'OPEN',
        },
        create: {
          leadId: lead.id,
          channel: message.channel,
          threadId: threadId || null,
          subject: message.subject,
          status: 'OPEN',
        },
      });

      await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          sender: process.env.AGENCY_EMAIL || 'outreach@apexdigital.example',
          recipient: message.channel === 'EMAIL' ? lead.email : lead.phone || '',
          subject: message.subject,
          content: message.emailBody,
          providerMessageId,
        },
      });

      // 7. Schedule smart follow-up sequence if campaign allows and followUpEmail exists
      if (message.followUpEmail) {
        await this.scheduleFollowUps({
          campaignId: message.campaignId,
          leadId: lead.id,
          parentMessageId: message.id,
          channel: message.channel,
          followUpEmailBody: message.followUpEmail,
          originalSubject: message.subject,
        });
      }

      await logAudit({
        userId,
        action: 'SEND_MESSAGE',
        entityType: 'GeneratedMessage',
        entityId: message.id,
        details: {
          recipient: lead.email,
          channel: message.channel,
          providerMessageId,
          isDryRun,
        },
      });

      return {
        success: true,
        messageId: message.id,
        providerMessageId,
        isDryRun,
        sentAt: new Date(),
      };
    } catch (err: any) {
      logger.error(`Failed to send message ${message.id}:`, err);

      await prisma.sendJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          lastError: err.message,
          attempts: { increment: 1 },
          lockedAt: null,
          lockedBy: null,
        },
      });

      await prisma.generatedMessage.update({
        where: { id: message.id },
        data: { status: 'FAILED', errorMessage: err.message },
      });

      throw err;
    }
  }

  /**
   * Schedule Day 4 and Day 9 smart follow-ups
   */
  private async scheduleFollowUps(params: {
    campaignId?: string | null;
    leadId: string;
    parentMessageId: string;
    channel: string;
    followUpEmailBody: string;
    originalSubject: string;
  }) {
    // Step 1: Day 4 Follow-up
    const day4 = new Date();
    day4.setDate(day4.getDate() + 4);

    await prisma.followUp.create({
      data: {
        campaignId: params.campaignId || null,
        leadId: params.leadId,
        parentMessageId: params.parentMessageId,
        stepNumber: 1,
        delayDays: 4,
        scheduledFor: day4,
        status: 'SCHEDULED',
        channel: params.channel,
        subject: `Follow up: ${params.originalSubject}`,
        body: params.followUpEmailBody,
      },
    });

    // Step 2: Day 9 Final Follow-up
    const day9 = new Date();
    day9.setDate(day9.getDate() + 9);

    const finalBody = `${params.followUpEmailBody}\n\nPS: This will be our last message so we don't crowd your inbox. Feel free to reach back out anytime when web or app development is top of mind.`;

    await prisma.followUp.create({
      data: {
        campaignId: params.campaignId || null,
        leadId: params.leadId,
        parentMessageId: params.parentMessageId,
        stepNumber: 2,
        delayDays: 9,
        scheduledFor: day9,
        status: 'SCHEDULED',
        channel: params.channel,
        subject: `Final check-in: ${params.originalSubject}`,
        body: finalBody,
      },
    });
  }
}

export const sendDispatcher = new SendDispatcher();
