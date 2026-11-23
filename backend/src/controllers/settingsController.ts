import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import { logAudit } from '../utils/audit.js';

export class SettingsController {
  async getSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const settings = await prisma.systemSetting.findMany();
      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }

      // Add integrations status summary
      const integrations = await prisma.integration.findMany({
        select: { provider: true, status: true, lastSyncAt: true },
      });

      res.json({
        settings: settingsMap,
        integrations,
        agency: {
          name: process.env.AGENCY_NAME || 'Apex Digital Studio',
          email: process.env.AGENCY_EMAIL || 'outreach@apexdigital.example',
          website: process.env.AGENCY_WEBSITE || 'https://apexdigital.example',
          services: process.env.AGENCY_SERVICES,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch settings' });
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const updates: Record<string, string> = req.body;

      for (const [key, value] of Object.entries(updates)) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE_SETTINGS',
        entityType: 'SystemSetting',
        details: updates,
      });

      res.json({ success: true, updated: updates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
  }

  async emergencyStop(req: AuthenticatedRequest, res: Response) {
    try {
      // Immediately turn on DRY_RUN and disable auto send / whatsapp send
      await prisma.systemSetting.upsert({
        where: { key: 'DRY_RUN' },
        update: { value: 'true' },
        create: { key: 'DRY_RUN', value: 'true' },
      });

      await prisma.systemSetting.upsert({
        where: { key: 'AUTO_SEND' },
        update: { value: 'false' },
        create: { key: 'AUTO_SEND', value: 'false' },
      });

      await prisma.systemSetting.upsert({
        where: { key: 'WHATSAPP_SEND_ENABLED' },
        update: { value: 'false' },
        create: { key: 'WHATSAPP_SEND_ENABLED', value: 'false' },
      });

      // Pause all active campaigns
      await prisma.campaign.updateMany({
        where: { status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'EMERGENCY_STOP_TRIGGERED',
        entityType: 'SystemSetting',
        details: { note: 'All sending paused immediately, DRY_RUN set to true' },
      });

      res.json({
        success: true,
        message: 'EMERGENCY STOP EXECUTED. All active campaigns paused and DRY_RUN forced.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to trigger emergency stop' });
    }
  }
}

export const settingsController = new SettingsController();
