import { Router } from 'express';
import { inboxController } from '../controllers/inboxController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', inboxController.getConversations.bind(inboxController));
router.get('/:conversationId', inboxController.getConversationDetails.bind(inboxController));
router.post('/:conversationId/reply', inboxController.sendManualReply.bind(inboxController));
router.patch('/:conversationId/status', inboxController.updateLeadStatus.bind(inboxController));

export default router;
