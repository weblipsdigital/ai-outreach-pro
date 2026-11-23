import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsappService.js';
import { logger } from '../utils/logger.js';

export class WebhookController {
  /**
   * Verify WhatsApp webhook registration (GET challenge)
   */
  async verifyWhatsApp(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const config = await whatsappService.getConfig();
    const expectedToken = config?.verifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === expectedToken) {
      logger.info('WhatsApp Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      logger.warn('WhatsApp Webhook verification failed. Invalid verify token.');
      res.status(403).send('Forbidden');
    }
  }

  /**
   * Handle incoming WhatsApp events and messages (POST)
   */
  async handleWhatsAppEvent(req: Request, res: Response) {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const rawBody = JSON.stringify(req.body);

      // Verify signature
      const isValid = whatsappService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        logger.warn('WhatsApp webhook signature verification failed.');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Process event asynchronously
      await whatsappService.processWebhookEvent(req.body);

      // Meta requires immediate 200 OK
      res.status(200).send('EVENT_RECEIVED');
    } catch (err: any) {
      logger.error('Error handling WhatsApp webhook event:', err);
      res.status(500).send('Error');
    }
  }
}

export const webhookController = new WebhookController();
