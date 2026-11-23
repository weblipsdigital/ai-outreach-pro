import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import { gmailService } from '../services/gmailService.js';
import { logAudit } from '../utils/audit.js';

export class InboxController {
  async getConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const { channel, status, search } = req.query;

      const where: any = {};
      if (channel) where.channel = String(channel);
      if (status) where.status = String(status);

      if (search) {
        where.lead = {
          OR: [
            { companyName: { contains: String(search) } },
            { contactName: { contains: String(search) } },
            { email: { contains: String(search) } },
          ],
        };
      }

      const conversations = await prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          lead: true,
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch conversations' });
    }
  }

  async getConversationDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId } = req.params;

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          lead: {
            include: {
              consentRecords: { take: 3, orderBy: { timestamp: 'desc' } },
              generatedMessages: { take: 5, orderBy: { createdAt: 'desc' } },
            },
          },
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      res.json(conversation);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch conversation details' });
    }
  }

  async updateLeadStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId } = req.params;
      const { status } = req.body;

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Update lead status
      await prisma.lead.update({
        where: { id: conversation.leadId },
        data: { status },
      });

      // Update conversation status
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status },
      });

      // If status changed to UNSUBSCRIBED or NOT_INTERESTED, cancel follow-ups
      if (['UNSUBSCRIBED', 'NOT_INTERESTED', 'CLOSED'].includes(status)) {
        await prisma.followUp.updateMany({
          where: { leadId: conversation.leadId, status: 'SCHEDULED' },
          data: { status: 'CANCELLED_STATUS' },
        });
      }

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE_LEAD_STATUS',
        entityType: 'Lead',
        entityId: conversation.leadId,
        details: { newStatus: status, conversationId },
      });

      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update lead status' });
    }
  }

  async sendManualReply(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId } = req.params;
      const { content, subject } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Reply content cannot be empty' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { lead: true },
      });

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      const dryRun = (await prisma.systemSetting.findUnique({ where: { key: 'DRY_RUN' } }))?.value === 'true';
      let providerMessageId = `reply-sim-${Date.now()}`;

      if (!dryRun && conversation.channel === 'EMAIL') {
        const sent = await gmailService.sendEmail({
          to: conversation.lead.email,
          subject: subject || conversation.subject || 'Follow up',
          bodyText: content,
          threadId: conversation.threadId || undefined,
        });
        providerMessageId = sent.messageId;
      }

      // Record outbound message
      const message = await prisma.conversationMessage.create({
        data: {
          conversationId,
          direction: 'OUTBOUND',
          sender: process.env.AGENCY_EMAIL || 'outreach@apexdigital.example',
          recipient: conversation.channel === 'EMAIL' ? conversation.lead.email : conversation.lead.phone || '',
          subject: subject || conversation.subject,
          content,
          providerMessageId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), status: 'CONTACTED' },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'SEND_MANUAL_REPLY',
        entityType: 'Conversation',
        entityId: conversationId,
        details: { to: conversation.lead.email, channel: conversation.channel },
      });

      res.status(201).json(message);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to send manual reply' });
    }
  }
}

export const inboxController = new InboxController();
