import { Router } from 'express';
import { campaignController } from '../controllers/campaignController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', campaignController.getCampaigns.bind(campaignController));
router.post('/', campaignController.createCampaign.bind(campaignController));
router.get('/:id', campaignController.getCampaignById.bind(campaignController));
router.patch('/:id', campaignController.updateCampaign.bind(campaignController));
router.post('/:id/start', campaignController.startCampaign.bind(campaignController));
router.post('/:id/pause', campaignController.pauseCampaign.bind(campaignController));
router.post('/:id/add-leads', campaignController.addLeadsToCampaign.bind(campaignController));

export default router;
