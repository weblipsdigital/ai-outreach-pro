import { Router } from 'express';
import authRoutes from './authRoutes.js';
import leadRoutes from './leadRoutes.js';
import sheetsRoutes from './sheetsRoutes.js';
import aiRoutes from './aiRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import messageRoutes from './messageRoutes.js';
import inboxRoutes from './inboxRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import integrationRoutes from './integrationRoutes.js';
import followUpRoutes from './followUpRoutes.js';
import auditRoutes from './auditRoutes.js';
import webhookRoutes from './webhookRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/sheets', sheetsRoutes);
router.use('/ai', aiRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/messages', messageRoutes);
router.use('/inbox', inboxRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/integrations', integrationRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
