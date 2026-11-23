import { Router } from 'express';
import { sheetsController } from '../controllers/sheetsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/status', sheetsController.getStatus.bind(sheetsController));
router.post('/sync', sheetsController.sync.bind(sheetsController));
router.post('/preview', sheetsController.preview.bind(sheetsController));
router.post('/connect', sheetsController.connect.bind(sheetsController));

export default router;
