import prisma from '../utils/prisma.js';
import { sendDispatcher } from './sendDispatcher.js';
import { logger } from '../utils/logger.js';
import { logAudit } from '../utils/audit.js';

export class FollowUpEngine {
  /**
   * Execute scheduled follow-ups that have matured and meet all eligibility conditions
   */
  async processDueFollowUps() {
    const now = new Date();

    // Check master switches
    const autoSend = (await prisma.systemSetting.findUnique({ where: { key: 'AUTO_SEND' } }))?.value === 'true';
    const dryRun = (await prisma.systemSetting.findUnique({ where: { key: 'DRY_RUN' } }))?.value === 'true';

    // In non-dry-run mode, if AUTO_SEND is disabled, do not send live emails automatically
    if (!dryRun && !autoSend) {
      logger.debug('AUTO_SEND is disabled; scheduled follow-ups remain pending approval');
      return { processed: 0, executed: 0, cancelled: 0 };
    }

    const dueFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
      },
      include: {
        lead: true,
        campaign: true,
      },
      take: 20, // batch of 20
    });

    let executed = 0;
    let cancelled = 0;

    for (const item of dueFollowUps) {
      const lead = item.lead;

      // Condition 1: Lead opted out or unsubscribed
      if (
        lead.status === 'UNSUBSCRIBED' ||
        lead.emailStatus === 'UNSUBSCRIBED' ||
        !lead.emailPermission
      ) {
        await prisma.followUp.update({
          where: { id: item.id },
          data: { status: 'CANCELLED_OPTOUT' },
        });
        cancelled++;
        continue;
      }

      // Condition 2: Lead has replied or changed status
      if (['REPLIED', 'INTERESTED', 'MEETING_REQUESTED', 'NOT_INTERESTED', 'CLOSED'].includes(lead.status)) {
        await prisma.followUp.update({
          where: { id: item.id },
          data: { status: 'CANCELLED_STATUS' },
        });
        cancelled++;
        continue;
      }

      // Condition 3: Check if conversation has any inbound replies
      const conversation = await prisma.conversation.findUnique({
        where: {
          leadId_channel: {
            leadId: lead.id,
            channel: item.channel,
          },
        },
        include: {
          messages: {
            where: { direction: 'INBOUND' },
          },
        },
      });

      if (conversation && conversation.messages.length > 0) {
        await prisma.followUp.update({
          where: { id: item.id },
          data: { status: 'CANCELLED_REPLY' },
        });
        cancelled++;
        continue;
      }

      // Condition 4: Campaign must be ACTIVE if associated
      if (item.campaign && item.campaign.status !== 'ACTIVE') {
        logger.debug(`Follow-up ${item.id} skipped: Campaign ${item.campaign.name} is ${item.campaign.status}`);
        continue;
      }

      // Condition 5: Check suppression list
      const isSuppressed = await prisma.suppressionList.findFirst({
        where: { identifier: lead.email.toLowerCase() },
      });
      if (isSuppressed) {
        await prisma.followUp.update({
          where: { id: item.id },
          data: { status: 'CANCELLED_OPTOUT' },
        });
        cancelled++;
        continue;
      }

      // Generate a follow-up GeneratedMessage and dispatch
      try {
        const followUpMessage = await prisma.generatedMessage.create({
          data: {
            leadId: lead.id,
            campaignId: item.campaignId,
            channel: item.channel,
            subject: item.subject,
            emailBody: item.body,
            suggestedService: item.campaign?.serviceOffered || 'Website development',
            personalizationReason: `Automated Follow-up Step ${item.stepNumber} after ${item.delayDays} days`,
            confidenceScore: 0.9,
            status: 'APPROVED',
          },
        });

        await sendDispatcher.sendApprovedMessage(followUpMessage.id, 'scheduler');

        await prisma.followUp.update({
          where: { id: item.id },
          data: { status: 'EXECUTED' },
        });

        executed++;
      } catch (err: any) {
        logger.error(`Error sending follow up ${item.id}:`, err);
      }
    }

    return {
      processed: dueFollowUps.length,
      executed,
      cancelled,
    };
  }
}

export const followUpEngine = new FollowUpEngine();
