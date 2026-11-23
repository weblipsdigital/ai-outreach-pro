import { Router } from 'express';
import { messageController } from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', messageController.getMessages.bind(messageController));
router.post('/:id/approve', messageController.approve.bind(messageController));
router.post('/:id/reject', messageController.reject.bind(messageController));
router.post('/:id/send', messageController.send.bind(messageController));
router.post('/bulk-approve', messageController.bulkApprove.bind(messageController));

export default router;
