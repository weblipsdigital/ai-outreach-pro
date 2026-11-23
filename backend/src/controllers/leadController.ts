import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { leadService } from '../services/leadService.js';
import { LeadSchema, LeadUpdateSchema } from '../validators/leadValidator.js';
import prisma from '../utils/prisma.js';

export class LeadController {
  async getLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        page,
        limit,
        search,
        status,
        serviceInterest,
        hasEmailPermission,
        hasWhatsAppOptIn,
      } = req.query;

      const result = await leadService.getLeads({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        serviceInterest: serviceInterest ? String(serviceInterest) : undefined,
        hasEmailPermission:
          hasEmailPermission !== undefined ? hasEmailPermission === 'true' : undefined,
        hasWhatsAppOptIn:
          hasWhatsAppOptIn !== undefined ? hasWhatsAppOptIn === 'true' : undefined,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch leads' });
    }
  }

  async createLead(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = LeadSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const result = await leadService.importLeads([validation.data], req.user?.id);
      if (result.errors.length > 0) {
        res.status(400).json({ error: result.errors[0].error });
        return;
      }

      const lead = await prisma.lead.findUnique({
        where: { email: validation.data.email },
      });
      res.status(201).json(lead);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create lead' });
    }
  }

  async updateLead(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validation = LeadUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const updated = await leadService.updateLead(id, validation.data, req.user?.id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update lead' });
    }
  }

  async deleteLead(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await leadService.deleteLead(id, req.user?.id);
      res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete lead' });
    }
  }

  async importBatch(req: AuthenticatedRequest, res: Response) {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows)) {
        res.status(400).json({ error: 'Payload must contain a "rows" array' });
        return;
      }

      const result = await leadService.importLeads(rows, req.user?.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Batch import failed' });
    }
  }
}

export const leadController = new LeadController();
