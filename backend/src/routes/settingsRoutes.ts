import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', settingsController.getSettings.bind(settingsController));
router.patch('/', settingsController.updateSettings.bind(settingsController));
router.post('/emergency-stop', settingsController.emergencyStop.bind(settingsController));

export default router;
