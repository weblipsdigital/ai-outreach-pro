import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { gmailService } from '../services/gmailService.js';
import { whatsappService } from '../services/whatsappService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Google OAuth endpoints
router.get('/google/auth-url', requireAuth, (req, res) => {
  try {
    const url = gmailService.getAuthorizationUrl();
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate auth url' });
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      res.status(400).send('Authorization code missing');
      return;
    }

    const { email } = await gmailService.handleCallback(String(code));
    // Redirect back to frontend settings page with success flag
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/integrations?google_connected=true&email=${encodeURIComponent(email)}`);
  } catch (err: any) {
    res.status(500).send(`Google authorization failed: ${err.message}`);
  }
});

router.get('/google/status', requireAuth, async (req, res) => {
  try {
    const status = await gmailService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/google/disconnect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await gmailService.disconnect(req.user?.id);
    res.json({ success: true, message: 'Google account disconnected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp Cloud API endpoints
router.get('/whatsapp/status', requireAuth, async (req, res) => {
  try {
    const status = await whatsappService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/whatsapp/config', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phoneNumberId, businessAccountId, accessToken, verifyToken, appSecret, hardSpendLimit } = req.body;
    await whatsappService.saveConfig(
      {
        phoneNumberId,
        businessAccountId: businessAccountId || '',
        accessToken,
        verifyToken: verifyToken || 'ai_outreach_wh_verify_secret_token',
        appSecret: appSecret || '',
        hardSpendLimit: Number(hardSpendLimit) || 0.0,
      },
      req.user?.id
    );
    res.json({ success: true, message: 'WhatsApp configuration saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
