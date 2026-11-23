import { google } from 'googleapis';
import prisma from '../utils/prisma.js';
import { decryptData, encryptData } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { logAudit } from '../utils/audit.js';

export interface GmailAuthTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
  id_token?: string | null;
  emailAddress?: string;
}

export class GmailService {
  private getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/integrations/google/callback'
    );
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    const oauth2 = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: 'ai_outreach_pro_oauth_state',
    });
  }

  /**
   * Handle OAuth redirect callback and store encrypted tokens
   */
  async handleCallback(code: string, userId?: string): Promise<{ email: string }> {
    const oauth2 = this.getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Fetch user email address from Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress || 'connected_account@gmail.com';

    const tokenPayload: GmailAuthTokens = {
      ...tokens,
      emailAddress,
    };

    const encrypted = encryptData(JSON.stringify(tokenPayload));

    await prisma.integration.upsert({
      where: { provider: 'GOOGLE_OAUTH' },
      update: {
        status: 'CONNECTED',
        configEncrypted: encrypted,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        lastSyncAt: new Date(),
        errorLog: null,
      },
      create: {
        provider: 'GOOGLE_OAUTH',
        status: 'CONNECTED',
        configEncrypted: encrypted,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    await logAudit({
      userId,
      action: 'CONNECT_GMAIL',
      entityType: 'Integration',
      entityId: 'GOOGLE_OAUTH',
      details: { emailAddress },
    });

    return { email: emailAddress };
  }

  /**
   * Get connected Gmail account status
   */
  async getStatus(): Promise<{
    connected: boolean;
    emailAddress: string | null;
    expiresAt: Date | null;
  }> {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'GOOGLE_OAUTH' },
    });

    if (!integration || !integration.configEncrypted || integration.status !== 'CONNECTED') {
      return { connected: false, emailAddress: null, expiresAt: null };
    }

    try {
      const tokens: GmailAuthTokens = JSON.parse(decryptData(integration.configEncrypted));
      return {
        connected: true,
        emailAddress: tokens.emailAddress || 'Connected Account',
        expiresAt: integration.expiresAt,
      };
    } catch {
      return { connected: false, emailAddress: null, expiresAt: null };
    }
  }

  /**
   * Disconnect Gmail account
   */
  async disconnect(userId?: string) {
    await prisma.integration.updateMany({
      where: { provider: 'GOOGLE_OAUTH' },
      data: { status: 'DISCONNECTED', configEncrypted: null },
    });

    await logAudit({
      userId,
      action: 'DISCONNECT_GMAIL',
      entityType: 'Integration',
      entityId: 'GOOGLE_OAUTH',
    });
  }

  /**
   * Get authenticated Gmail API client with auto-refreshing token
   */
  private async getAuthenticatedGmail() {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'GOOGLE_OAUTH' },
    });

    if (!integration || !integration.configEncrypted) {
      throw new Error('Gmail integration not connected. Please connect your Gmail account in API Integrations.');
    }

    const tokens: GmailAuthTokens = JSON.parse(decryptData(integration.configEncrypted));
    const oauth2 = this.getOAuth2Client();
    oauth2.setCredentials(tokens as any);

    // Refresh token listener to persist refreshed credentials
    oauth2.on('tokens', async (newTokens) => {
      const updated: GmailAuthTokens = {
        ...tokens,
        ...newTokens,
      };
      await prisma.integration.update({
        where: { provider: 'GOOGLE_OAUTH' },
        data: {
          configEncrypted: encryptData(JSON.stringify(updated)),
          expiresAt: updated.expiry_date ? new Date(updated.expiry_date) : null,
        },
      });
    });

    return {
      gmail: google.gmail({ version: 'v1', auth: oauth2 }),
      senderEmail: tokens.emailAddress || 'me',
    };
  }

  /**
   * Construct RFC 2822 Base64URL-encoded MIME message
   */
  private createMimeMessage(params: {
    to: string;
    from: string;
    subject: string;
    bodyText: string;
    inReplyTo?: string;
    references?: string;
  }): string {
    const utf8Subject = `=?utf-8?B?${Buffer.from(params.subject).toString('base64')}?=`;
    const messageParts = [
      `From: ${params.from}`,
      `To: ${params.to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
    ];

    if (params.inReplyTo) {
      messageParts.push(`In-Reply-To: <${params.inReplyTo}>`);
    }
    if (params.references) {
      messageParts.push(`References: <${params.references}>`);
    }

    messageParts.push('', params.bodyText);
    const message = messageParts.join('\r\n');

    // Base64url encode
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Send email using Gmail API
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    bodyText: string;
    threadId?: string;
    inReplyTo?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    const { gmail, senderEmail } = await this.getAuthenticatedGmail();

    const raw = this.createMimeMessage({
      to: params.to,
      from: senderEmail,
      subject: params.subject,
      bodyText: params.bodyText,
      inReplyTo: params.inReplyTo,
      references: params.inReplyTo,
    });

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        threadId: params.threadId || undefined,
      },
    });

    if (!res.data.id) {
      throw new Error('Gmail API failed to return message ID');
    }

    return {
      messageId: res.data.id,
      threadId: res.data.threadId || res.data.id,
    };
  }

  /**
   * Create an email draft in Gmail without sending
   */
  async createDraft(params: {
    to: string;
    subject: string;
    bodyText: string;
  }): Promise<{ draftId: string }> {
    const { gmail, senderEmail } = await this.getAuthenticatedGmail();

    const raw = this.createMimeMessage({
      to: params.to,
      from: senderEmail,
      subject: params.subject,
      bodyText: params.bodyText,
    });

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw },
      },
    });

    return { draftId: res.data.id || 'created' };
  }

  /**
   * Poll for replies to tracked Gmail threads
   */
  async checkRepliesForThread(threadId: string): Promise<Array<{
    id: string;
    sender: string;
    snippet: string;
    date: Date;
    body: string;
  }>> {
    try {
      const { gmail, senderEmail } = await this.getAuthenticatedGmail();
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      const messages = thread.data.messages || [];
      const replies = [];

      for (const msg of messages) {
        // Find headers
        const headers = msg.payload?.headers || [];
        const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
        
        // If message is from recipient (not from us)
        if (fromHeader && !fromHeader.includes(senderEmail)) {
          replies.push({
            id: msg.id || '',
            sender: fromHeader,
            snippet: msg.snippet || '',
            date: msg.internalDate ? new Date(Number(msg.internalDate)) : new Date(),
            body: msg.snippet || '',
          });
        }
      }

      return replies;
    } catch (err: any) {
      logger.error(`Error checking replies for thread ${threadId}:`, err);
      return [];
    }
  }
}

export const gmailService = new GmailService();
