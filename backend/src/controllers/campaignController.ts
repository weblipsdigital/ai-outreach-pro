import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import { logAudit } from '../utils/audit.js';

export class CampaignController {
  async getCampaigns(req: AuthenticatedRequest, res: Response) {
    try {
      const campaigns = await prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              recipients: true,
              generatedMessages: true,
              followUps: true,
            },
          },
        },
      });

      res.json(campaigns);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch campaigns' });
    }
  }

  async getCampaignById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
          recipients: {
            include: { lead: true },
            take: 50,
          },
          generatedMessages: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      res.json(campaign);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch campaign' });
    }
  }

  async createCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, targetAudience, serviceOffered, communicationChannel, dailySendingCap, approvalMode, followUpPolicy } = req.body;

      if (!name || !serviceOffered) {
        res.status(400).json({ error: 'Campaign name and serviceOffered are required' });
        return;
      }

      const campaign = await prisma.campaign.create({
        data: {
          name,
          targetAudience,
          serviceOffered,
          communicationChannel: communicationChannel || 'EMAIL',
          dailySendingCap: Number(dailySendingCap) || 10,
          approvalMode: approvalMode || 'MANUAL',
          followUpPolicy: followUpPolicy ? (typeof followUpPolicy === 'string' ? followUpPolicy : JSON.stringify(followUpPolicy)) : null,
          status: 'DRAFT',
        },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'CREATE_CAMPAIGN',
        entityType: 'Campaign',
        entityId: campaign.id,
        details: { name, serviceOffered },
      });

      res.status(201).json(campaign);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create campaign' });
    }
  }

  async updateCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updated = await prisma.campaign.update({
        where: { id },
        data: req.body,
      });

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE_CAMPAIGN',
        entityType: 'Campaign',
        entityId: id,
        details: req.body,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update campaign' });
    }
  }

  async startCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await prisma.campaign.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'START_CAMPAIGN',
        entityType: 'Campaign',
        entityId: id,
      });

      res.json({ success: true, status: 'ACTIVE', campaign });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to start campaign' });
    }
  }

  async pauseCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await prisma.campaign.update({
        where: { id },
        data: { status: 'PAUSED' },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'PAUSE_CAMPAIGN',
        entityType: 'Campaign',
        entityId: id,
      });

      res.json({ success: true, status: 'PAUSED', campaign });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to pause campaign' });
    }
  }

  async addLeadsToCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { leadIds } = req.body;

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        res.status(400).json({ error: 'leadIds array is required' });
        return;
      }

      let added = 0;
      for (const leadId of leadIds) {
        try {
          await prisma.campaignRecipient.upsert({
            where: {
              campaignId_leadId_stepNumber: {
                campaignId: id,
                leadId,
                stepNumber: 0,
              },
            },
            update: {},
            create: {
              campaignId: id,
              leadId,
              status: 'PENDING',
              stepNumber: 0,
            },
          });
          added++;
        } catch {
          // Ignore duplicates
        }
      }

      res.json({ success: true, addedCount: added });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to add leads to campaign' });
    }
  }
}

export const campaignController = new CampaignController();
