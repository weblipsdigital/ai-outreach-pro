import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { limit, action } = req.query;
    const where: any = {};
    if (action) where.action = String(action);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(200, Number(limit) || 50),
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
});

export default router;
