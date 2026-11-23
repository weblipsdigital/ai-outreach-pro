import { Router } from 'express';
import { webhookController } from '../controllers/webhookController.js';

const router = Router();

// Public webhook endpoints verified by tokens / Meta HMAC
router.get('/whatsapp', webhookController.verifyWhatsApp.bind(webhookController));
router.post('/whatsapp', webhookController.handleWhatsAppEvent.bind(webhookController));

export default router;
