import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import { followUpEngine } from '../services/followUpEngine.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const followUps = await prisma.followUp.findMany({
      orderBy: { scheduledFor: 'asc' },
      include: {
        lead: { select: { id: true, companyName: true, contactName: true, email: true, status: true } },
        campaign: { select: { id: true, name: true } },
      },
      take: 100,
    });
    res.json(followUps);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch follow-ups' });
  }
});

router.post('/process-now', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await followUpEngine.processDueFollowUps();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process follow-ups' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.followUp.update({
      where: { id },
      data: { status: 'CANCELLED_STATUS' },
    });
    res.json({ success: true, message: 'Follow up cancelled' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
