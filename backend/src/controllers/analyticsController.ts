import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

export class AnalyticsController {
  async getOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const [
        totalLeads,
        eligibleLeads,
        draftsGenerated,
        messagesApproved,
        emailsSent,
        whatsappSent,
        failedSends,
        repliesReceived,
        positiveReplies,
        meetingsRequested,
        optOuts,
        recentActivity,
        leadStatusBreakdown,
      ] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({
          where: {
            OR: [{ emailPermission: true }, { whatsappOptIn: true }],
            status: { not: 'UNSUBSCRIBED' },
          },
        }),
        prisma.generatedMessage.count(),
        prisma.generatedMessage.count({ where: { status: 'APPROVED' } }),
        prisma.sendJob.count({ where: { channel: 'EMAIL', status: 'SENT' } }),
        prisma.sendJob.count({ where: { channel: 'WHATSAPP', status: 'SENT' } }),
        prisma.sendJob.count({ where: { status: 'FAILED' } }),
        prisma.lead.count({
          where: { status: { in: ['REPLIED', 'INTERESTED', 'MEETING_REQUESTED'] } },
        }),
        prisma.lead.count({
          where: { status: 'INTERESTED' },
        }),
        prisma.lead.count({
          where: { status: 'MEETING_REQUESTED' },
        }),
        prisma.suppressionList.count(),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: { user: { select: { name: true, email: true } } },
        }),
        prisma.lead.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
      ]);

      // Service interest distribution
      const services = await prisma.lead.groupBy({
        by: ['serviceInterest'],
        _count: { id: true },
      });

      // Recent 7 days send timeline for Recharts
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const recentSends = await prisma.sendJob.findMany({
        where: {
          status: 'SENT',
          sentAt: { gte: sevenDaysAgo },
        },
        select: { sentAt: true, channel: true },
      });

      const timelineMap: Record<string, { date: string; emails: number; whatsapp: number }> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split('T')[0];
        timelineMap[key] = { date: key.slice(5), emails: 0, whatsapp: 0 };
      }

      for (const s of recentSends) {
        if (!s.sentAt) continue;
        const key = s.sentAt.toISOString().split('T')[0];
        if (timelineMap[key]) {
          if (s.channel === 'EMAIL') timelineMap[key].emails++;
          else if (s.channel === 'WHATSAPP') timelineMap[key].whatsapp++;
        }
      }

      res.json({
        metrics: {
          totalLeads,
          eligibleLeads,
          draftsGenerated,
          messagesApproved,
          emailsSent,
          whatsappSent,
          failedSends,
          repliesReceived,
          positiveReplies,
          meetingsRequested,
          optOuts,
        },
        serviceDistribution: services.map((s) => ({
          name: s.serviceInterest || 'General Web Dev',
          value: s._count.id,
        })),
        leadStatusBreakdown: leadStatusBreakdown.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        timeline: Object.values(timelineMap),
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          user: a.user?.name || 'System / Cron',
          details: a.details ? JSON.parse(a.details) : null,
          timestamp: a.timestamp,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
    }
  }
}

export const analyticsController = new AnalyticsController();
