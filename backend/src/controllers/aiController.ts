import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { aiService } from '../services/aiService.js';
import { messageService } from '../services/messageService.js';
import { AIGenerateRequestSchema } from '../validators/aiValidator.js';

export class AIController {
  async getStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const status = await aiService.getProviderStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get AI provider status' });
    }
  }

  async listModels(req: AuthenticatedRequest, res: Response) {
    try {
      const models = await aiService.listAvailableModels();
      res.json(models);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list models' });
    }
  }

  async generate(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = AIGenerateRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
        return;
      }

      const draft = await messageService.generateDraftForLead(
        validation.data.leadId,
        validation.data.campaignId,
        validation.data.serviceOverride,
        req.user?.id
      );

      res.status(201).json(draft);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Generation failed' });
    }
  }

  async generateBatch(req: AuthenticatedRequest, res: Response) {
    try {
      const { campaignId, maxDrafts } = req.body;
      const result = await messageService.generateBatchDrafts(campaignId, maxDrafts || 25, req.user?.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Batch generation failed' });
    }
  }

  async testConnection(req: AuthenticatedRequest, res: Response) {
    try {
      const { provider } = req.body; // 'OPENROUTER' or 'OLLAMA'
      const status = await aiService.getProviderStatus();

      if (provider === 'OLLAMA') {
        res.json({
          provider: 'OLLAMA',
          success: status.ollama.available,
          models: status.ollama.installedModels,
          error: status.ollama.error,
        });
      } else {
        res.json({
          provider: 'OPENROUTER',
          success: status.openrouter.available,
          model: status.openrouter.model,
          error: status.openrouter.error,
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Test failed' });
    }
  }
}

export const aiController = new AIController();
