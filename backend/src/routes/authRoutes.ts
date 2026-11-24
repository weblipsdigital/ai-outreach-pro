import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.get('/setup-admin', authController.setupAdmin.bind(authController));
router.get('/me', requireAuth, authController.me.bind(authController));

export default router;
