import cron from 'node-cron';
import { followUpEngine } from '../services/followUpEngine.js';
import { googleSheetsService } from '../services/googleSheetsService.js';
import { gmailService } from '../services/gmailService.js';
import prisma from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

export class OutreachScheduler {
  private scheduledTasks: cron.ScheduledTask[] = [];

  /**
   * Start recurring background workers
   */
  startAll() {
    logger.info('Initializing Outreach Automation Scheduler...');

    // 1. Process Due Follow-ups every 15 minutes
    const followUpTask = cron.schedule('*/15 * * * *', async () => {
      try {
        logger.debug('Running scheduled follow-up check...');
        const result = await followUpEngine.processDueFollowUps();
        if (result.executed > 0 || result.cancelled > 0) {
          logger.info(`Follow-up check completed: ${result.executed} sent, ${result.cancelled} cancelled.`);
        }
      } catch (e) {
        logger.error('Error in follow-up worker:', e);
      }
    });
    this.scheduledTasks.push(followUpTask);

    // 2. Poll Gmail Replies every 10 minutes
    const replyTask = cron.schedule('*/10 * * * *', async () => {
      try {
        await this.syncGmailReplies();
      } catch (e) {
        logger.error('Error in Gmail reply detection worker:', e);
      }
    });
    this.scheduledTasks.push(replyTask);

    // 3. Google Sheets Scheduled Synchronization (every 60 minutes)
    const sheetsTask = cron.schedule('0 * * * *', async () => {
      try {
        const config = await googleSheetsService.getConfig();
        if (config?.autoSyncEnabled && config.spreadsheetId) {
          logger.info(`Running scheduled Google Sheets sync for ${config.spreadsheetId}...`);
          await googleSheetsService.syncNow(config.spreadsheetId, config.sheetName, 'system_cron');
        }
      } catch (e) {
        logger.error('Error in Google Sheets sync worker:', e);
      }
    });
    this.scheduledTasks.push(sheetsTask);

    logger.info('Scheduler started with 3 active background jobs.');
  }

  /**
   * Detect incoming replies from Gmail threads
   */
  private async syncGmailReplies() {
    // Find all active conversations with a threadId
    const conversations = await prisma.conversation.findMany({
      where: {
        channel: 'EMAIL',
        threadId: { not: null },
        status: { in: ['OPEN', 'CONTACTED'] },
      },
      include: { lead: true },
      take: 25,
    });

    for (const conv of conversations) {
      if (!conv.threadId) continue;
      try {
        const replies = await gmailService.checkRepliesForThread(conv.threadId);
        for (const reply of replies) {
          // Check if message already recorded
          const existingMsg = await prisma.conversationMessage.findFirst({
            where: { providerMessageId: reply.id },
          });

          if (!existingMsg) {
            // New reply received!
            await prisma.conversationMessage.create({
              data: {
                conversationId: conv.id,
                direction: 'INBOUND',
                sender: reply.sender,
                recipient: conv.lead.email,
                subject: reply.snippet,
                content: reply.body,
                providerMessageId: reply.id,
                timestamp: reply.date,
              },
            });

            // Update lead status to REPLIED
            await prisma.lead.update({
              where: { id: conv.lead.id },
              data: { status: 'REPLIED' },
            });

            await prisma.conversation.update({
              where: { id: conv.id },
              data: { status: 'REPLIED', lastMessageAt: new Date() },
            });

            // Automatically cancel pending follow-ups for this lead
            await prisma.followUp.updateMany({
              where: { leadId: conv.lead.id, status: 'SCHEDULED' },
              data: { status: 'CANCELLED_REPLY' },
            });

            logger.info(`Detected new Gmail reply from ${conv.lead.email}! Cancelled active follow-ups.`);
          }
        }
      } catch (err: any) {
        logger.debug(`Failed to check replies for thread ${conv.threadId}: ${err.message}`);
      }
    }
  }

  /**
   * Stop all running scheduler jobs
   */
  stopAll() {
    for (const task of this.scheduledTasks) {
      task.stop();
    }
    this.scheduledTasks = [];
    logger.info('Outreach Automation Scheduler stopped.');
  }
}

export const outreachScheduler = new OutreachScheduler();
