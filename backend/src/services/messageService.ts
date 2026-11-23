import prisma from '../utils/prisma.js';
import { aiService } from './aiService.js';
import { logAudit } from '../utils/audit.js';
import { logger } from '../utils/logger.js';

export class MessageService {
  /**
   * Generate an outreach draft for a single lead or campaign recipient
   */
  async generateDraftForLead(leadId: string, campaignId?: string, serviceOverride?: string, userId?: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error('Lead not found');

    // Strict compliance: Must have permission to draft for email or whatsapp
    if (!lead.emailPermission && !lead.whatsappOptIn) {
      throw new Error(`Lead ${lead.companyName} (${lead.email}) does not have explicit consent for outreach.`);
    }

    const { message, modelUsed } = await aiService.generateOutreachMessage({
      leadId,
      campaignId,
      serviceOverride,
      userId,
    });

    // Check if system has AUTO_APPROVE enabled in SystemSetting
    const autoApproveSetting = await prisma.systemSetting.findUnique({
      where: { key: 'AUTO_APPROVE' },
    });
    const isAutoApprove = autoApproveSetting?.value === 'true';

    // Save or update generated message
    const generated = await prisma.generatedMessage.create({
      data: {
        leadId,
        campaignId: campaignId || null,
        channel: lead.emailPermission ? 'EMAIL' : 'WHATSAPP',
        subject: message.subject,
        emailBody: message.email_body,
        whatsappTemplateName: 'client_outreach_v1',
        whatsappTemplateVariables: JSON.stringify(message.whatsapp_template_variables),
        suggestedService: message.suggested_service,
        personalizationReason: message.personalization_reason,
        confidenceScore: message.confidence_score,
        followUpEmail: message.follow_up_email,
        status: isAutoApprove ? 'APPROVED' : 'PENDING_APPROVAL',
        generatedByModel: modelUsed,
      },
    });

    // Update lead status to DRAFTED if currently NEW
    if (lead.status === 'NEW') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'DRAFTED' },
      });
    }

    // If campaign recipient exists, associate
    if (campaignId) {
      await prisma.campaignRecipient.updateMany({
        where: { campaignId, leadId },
        data: { status: isAutoApprove ? 'APPROVED' : 'PENDING' },
      });
    }

    return generated;
  }

  /**
   * Batch generate drafts for all eligible leads in a campaign or entire pool
   */
  async generateBatchDrafts(campaignId?: string, maxDrafts = 50, userId?: string) {
    let eligibleLeads: any[] = [];

    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { recipients: { include: { lead: true } } },
      });
      if (!campaign) throw new Error('Campaign not found');

      // Leads in campaign that have consent and no message drafted yet
      const draftedLeadIds = (
        await prisma.generatedMessage.findMany({
          where: { campaignId },
          select: { leadId: true },
        })
      ).map((m) => m.leadId);

      const draftedSet = new Set(draftedLeadIds);
      eligibleLeads = campaign.recipients
        .map((r) => r.lead)
        .filter((l) => (l.emailPermission || l.whatsappOptIn) && !draftedSet.has(l.id) && l.status !== 'UNSUBSCRIBED')
        .slice(0, maxDrafts);
    } else {
      // General pool of eligible leads
      eligibleLeads = await prisma.lead.findMany({
        where: {
          status: 'NEW',
          OR: [{ emailPermission: true }, { whatsappOptIn: true }],
        },
        take: maxDrafts,
      });
    }

    const generated = [];
    const errors = [];

    for (const lead of eligibleLeads) {
      try {
        const draft = await this.generateDraftForLead(lead.id, campaignId, undefined, userId);
        generated.push(draft);
      } catch (err: any) {
        logger.error(`Error drafting for lead ${lead.email}:`, err);
        errors.push({ leadId: lead.id, email: lead.email, error: err.message });
      }
    }

    return {
      totalAttempted: eligibleLeads.length,
      successCount: generated.length,
      failedCount: errors.length,
      drafts: generated,
      errors,
    };
  }

  /**
   * Get messages with filtering (for Approval Queue, Sent list, etc.)
   */
  async getMessages(query: {
    page?: number;
    limit?: number;
    status?: string;
    campaignId?: string;
    channel?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.campaignId) where.campaignId = query.campaignId;
    if (query.channel) where.channel = query.channel;

    const [total, messages] = await Promise.all([
      prisma.generatedMessage.count({ where }),
      prisma.generatedMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: true,
          campaign: { select: { id: true, name: true } },
          approvals: { take: 1, orderBy: { reviewedAt: 'desc' } },
        },
      }),
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Approve a message
   */
  async approveMessage(
    id: string,
    params: {
      userId?: string;
      modifiedSubject?: string;
      modifiedBody?: string;
      reviewNotes?: string;
    }
  ) {
    const message = await prisma.generatedMessage.findUnique({
      where: { id },
      include: { lead: true },
    });
    if (!message) throw new Error('Message not found');

    const isModified = !!(params.modifiedSubject || params.modifiedBody);
    const updatedSubject = params.modifiedSubject || message.subject;
    const updatedBody = params.modifiedBody || message.emailBody;

    // Update message
    const updated = await prisma.generatedMessage.update({
      where: { id },
      data: {
        status: 'APPROVED',
        subject: updatedSubject,
        emailBody: updatedBody,
      },
    });

    // Record approval audit record
    await prisma.messageApproval.create({
      data: {
        generatedMessageId: id,
        reviewerUserId: params.userId || null,
        decision: isModified ? 'MODIFIED' : 'APPROVED',
        modifiedSubject: params.modifiedSubject || null,
        modifiedBody: params.modifiedBody || null,
        reviewNotes: params.reviewNotes || null,
      },
    });

    // Create queued SendJob
    const idempotencyKey = `send-${message.id}-${Date.now()}`;
    await prisma.sendJob.create({
      data: {
        generatedMessageId: id,
        channel: message.channel,
        scheduledFor: new Date(),
        status: 'QUEUED',
        idempotencyKey,
      },
    });

    await logAudit({
      userId: params.userId,
      action: isModified ? 'APPROVE_MODIFIED_MESSAGE' : 'APPROVE_MESSAGE',
      entityType: 'GeneratedMessage',
      entityId: id,
      details: { leadEmail: message.lead.email, channel: message.channel },
    });

    return updated;
  }

  /**
   * Bulk approve eligible messages
   */
  async bulkApprove(messageIds: string[], userId?: string) {
    const results = [];
    for (const id of messageIds) {
      try {
        const approved = await this.approveMessage(id, { userId });
        results.push({ id, success: true });
      } catch (err: any) {
        results.push({ id, success: false, error: err.message });
      }
    }
    return results;
  }

  /**
   * Reject a message
   */
  async rejectMessage(id: string, reason?: string, userId?: string) {
    const updated = await prisma.generatedMessage.update({
      where: { id },
      data: { status: 'REJECTED', errorMessage: reason || 'Rejected by user' },
    });

    await prisma.messageApproval.create({
      data: {
        generatedMessageId: id,
        reviewerUserId: userId || null,
        decision: 'REJECTED',
        reviewNotes: reason || 'Rejected',
      },
    });

    await logAudit({
      userId,
      action: 'REJECT_MESSAGE',
      entityType: 'GeneratedMessage',
      entityId: id,
      details: { reason },
    });

    return updated;
  }
}

export const messageService = new MessageService();
