import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/status', aiController.getStatus.bind(aiController));
router.get('/models', aiController.listModels.bind(aiController));
router.post('/generate', aiController.generate.bind(aiController));
router.post('/generate-batch', aiController.generateBatch.bind(aiController));
router.post('/test', aiController.testConnection.bind(aiController));

export default router;
