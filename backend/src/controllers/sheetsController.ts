import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { googleSheetsService } from '../services/googleSheetsService.js';
import prisma from '../utils/prisma.js';

export class SheetsController {
  async getStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const config = await googleSheetsService.getConfig();
      const integration = await prisma.integration.findUnique({
        where: { provider: 'GOOGLE_SHEETS' },
      });

      res.json({
        connected: !!config?.spreadsheetId,
        spreadsheetId: config?.spreadsheetId || null,
        sheetName: config?.sheetName || 'Sheet1',
        lastSyncAt: integration?.lastSyncAt || null,
        status: integration?.status || 'DISCONNECTED',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get sheets status' });
    }
  }

  async connect(req: AuthenticatedRequest, res: Response) {
    try {
      const { spreadsheetId, sheetName, serviceAccountKeyJson, autoSyncEnabled, syncIntervalMinutes } = req.body;
      if (!spreadsheetId) {
        res.status(400).json({ error: 'spreadsheetId is required' });
        return;
      }

      await googleSheetsService.saveConfig(
        {
          spreadsheetId,
          sheetName: sheetName || 'Sheet1',
          serviceAccountKeyJson,
          autoSyncEnabled: !!autoSyncEnabled,
          syncIntervalMinutes: syncIntervalMinutes || 60,
        },
        req.user?.id
      );

      res.json({ success: true, message: 'Google Sheets configured successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to connect Google Sheets' });
    }
  }

  async preview(req: AuthenticatedRequest, res: Response) {
    try {
      const { spreadsheetId, sheetName } = req.body;
      const result = await googleSheetsService.previewSheet(spreadsheetId, sheetName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to preview Google Sheet' });
    }
  }

  async sync(req: AuthenticatedRequest, res: Response) {
    try {
      const { spreadsheetId, sheetName } = req.body;
      const result = await googleSheetsService.syncNow(spreadsheetId, sheetName, req.user?.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to synchronize Google Sheet' });
    }
  }
}

export const sheetsController = new SheetsController();
