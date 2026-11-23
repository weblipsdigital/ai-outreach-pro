import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { messageService } from '../services/messageService.js';
import { sendDispatcher } from '../services/sendDispatcher.js';

export class MessageController {
  async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const { page, limit, status, campaignId, channel } = req.query;
      const result = await messageService.getMessages({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status ? String(status) : undefined,
        campaignId: campaignId ? String(campaignId) : undefined,
        channel: channel ? String(channel) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch messages' });
    }
  }

  async approve(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { modifiedSubject, modifiedBody, reviewNotes } = req.body;

      const result = await messageService.approveMessage(id, {
        userId: req.user?.id,
        modifiedSubject,
        modifiedBody,
        reviewNotes,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to approve message' });
    }
  }

  async bulkApprove(req: AuthenticatedRequest, res: Response) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: 'ids array is required' });
        return;
      }

      const results = await messageService.bulkApprove(ids, req.user?.id);
      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to bulk approve messages' });
    }
  }

  async reject(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await messageService.rejectMessage(id, reason, req.user?.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reject message' });
    }
  }

  async send(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      // Send directly via centralized send dispatcher
      const sendResult = await sendDispatcher.sendApprovedMessage(id, req.user?.id);
      res.json(sendResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to send message' });
    }
  }
}

export const messageController = new MessageController();
