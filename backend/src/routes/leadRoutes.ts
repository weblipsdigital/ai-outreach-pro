import { Router } from 'express';
import { leadController } from '../controllers/leadController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', leadController.getLeads.bind(leadController));
router.post('/', leadController.createLead.bind(leadController));
router.patch('/:id', leadController.updateLead.bind(leadController));
router.delete('/:id', leadController.deleteLead.bind(leadController));
router.post('/batch', leadController.importBatch.bind(leadController));

export default router;
