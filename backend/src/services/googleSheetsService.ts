import { google } from 'googleapis';
import prisma from '../utils/prisma.js';
import { leadService } from './leadService.js';
import { logger } from '../utils/logger.js';
import { decryptData, encryptData } from '../utils/crypto.js';
import { logAudit } from '../utils/audit.js';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  accessToken?: string;
  refreshToken?: string;
  serviceAccountKeyJson?: string;
  autoSyncEnabled?: boolean;
  syncIntervalMinutes?: number;
}

export class GoogleSheetsService {
  /**
   * Returns authenticated OAuth2 client for Google
   */
  private getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/integrations/google/callback'
    );
  }

  /**
   * Get stored Google integration config
   */
  async getConfig(): Promise<GoogleSheetsConfig | null> {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'GOOGLE_SHEETS' },
    });

    if (!integration || !integration.configEncrypted) {
      return null;
    }

    try {
      const decrypted = decryptData(integration.configEncrypted);
      return JSON.parse(decrypted);
    } catch (err) {
      logger.error('Failed to decrypt Google Sheets config:', err);
      return null;
    }
  }

  /**
   * Save Google Sheets integration configuration
   */
  async saveConfig(config: GoogleSheetsConfig, userId?: string) {
    const encrypted = encryptData(JSON.stringify(config));

    await prisma.integration.upsert({
      where: { provider: 'GOOGLE_SHEETS' },
      update: {
        status: config.spreadsheetId ? 'CONNECTED' : 'DISCONNECTED',
        configEncrypted: encrypted,
        lastSyncAt: new Date(),
      },
      create: {
        provider: 'GOOGLE_SHEETS',
        status: config.spreadsheetId ? 'CONNECTED' : 'DISCONNECTED',
        configEncrypted: encrypted,
      },
    });

    await logAudit({
      userId,
      action: 'UPDATE_CONFIG',
      entityType: 'Integration',
      entityId: 'GOOGLE_SHEETS',
      details: { spreadsheetId: config.spreadsheetId, sheetName: config.sheetName },
    });
  }

  /**
   * Fetch raw rows from Google Sheets via Google Sheets API v4
   */
  async fetchRows(spreadsheetId: string, sheetName: string = 'Sheet1'): Promise<any[]> {
    const config = await this.getConfig();

    // Authenticate using service account or user tokens or API Key
    let authClient: any;

    if (config?.serviceAccountKeyJson) {
      const credentials = JSON.parse(config.serviceAccountKeyJson);
      authClient = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
      );
    } else if (config?.refreshToken) {
      const oauth2 = this.getOAuth2Client();
      oauth2.setCredentials({
        refresh_token: config.refreshToken,
        access_token: config.accessToken,
      });
      authClient = oauth2;
    } else {
      // Check if global OAuth integration has tokens
      const googleOAuth = await prisma.integration.findUnique({
        where: { provider: 'GOOGLE_OAUTH' },
      });
      if (googleOAuth?.configEncrypted) {
        const oauthData = JSON.parse(decryptData(googleOAuth.configEncrypted));
        const oauth2 = this.getOAuth2Client();
        oauth2.setCredentials(oauthData);
        authClient = oauth2;
      }
    }

    if (!authClient) {
      throw new Error(
        'Google Sheets integration not connected. Please connect Google account or provide Service Account credentials.'
      );
    }

    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1000`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    // Header mapping (row 0)
    const rawHeaders = rows[0].map((h: string) => String(h).trim().toLowerCase().replace(/[\s_-]+/g, '_'));

    const mappedRows: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row.some((cell: any) => cell && String(cell).trim() !== '')) {
        continue; // skip blank rows
      }

      const rowObj: Record<string, any> = {};
      rawHeaders.forEach((header: string, index: number) => {
        rowObj[header] = row[index] !== undefined ? String(row[index]).trim() : '';
      });

      // Map common alternative column names to standard keys
      const standardLead = {
        lead_id: rowObj.lead_id || rowObj.id || `GS-${Date.now()}-${i}`,
        company_name: rowObj.company_name || rowObj.company || rowObj.business_name || '',
        contact_name: rowObj.contact_name || rowObj.name || rowObj.contact || rowObj.full_name || '',
        business_type: rowObj.business_type || rowObj.industry || rowObj.niche || '',
        email: rowObj.email || rowObj.contact_email || rowObj.business_email || '',
        phone: rowObj.phone || rowObj.phone_number || rowObj.mobile || rowObj.whatsapp || '',
        website: rowObj.website || rowObj.url || rowObj.domain || '',
        location: rowObj.location || rowObj.city || rowObj.address || '',
        existing_website_status: rowObj.existing_website_status || rowObj.website_status || '',
        service_interest: rowObj.service_interest || rowObj.service || rowObj.interest || '',
        email_permission: rowObj.email_permission || rowObj.email_opt_in || rowObj.consent || 'false',
        whatsapp_opt_in: rowObj.whatsapp_opt_in || rowObj.whatsapp_permission || 'false',
        consent_source: rowObj.consent_source || 'Google Sheets Import',
        consent_timestamp: rowObj.consent_timestamp || new Date().toISOString(),
        notes: rowObj.notes || rowObj.comments || '',
      };

      mappedRows.push(standardLead);
    }

    return mappedRows;
  }

  /**
   * Preview rows without importing
   */
  async previewSheet(spreadsheetId: string, sheetName: string = 'Sheet1') {
    const rows = await this.fetchRows(spreadsheetId, sheetName);
    return {
      rowCount: rows.length,
      sampleRows: rows.slice(0, 5),
    };
  }

  /**
   * Perform synchronization
   */
  async syncNow(spreadsheetId?: string, sheetName?: string, userId?: string) {
    const config = await this.getConfig();
    const targetSpreadsheetId = spreadsheetId || config?.spreadsheetId;
    const targetSheetName = sheetName || config?.sheetName || 'Sheet1';

    if (!targetSpreadsheetId) {
      throw new Error('Spreadsheet ID is required to synchronize.');
    }

    const rows = await this.fetchRows(targetSpreadsheetId, targetSheetName);
    const result = await leadService.importLeads(rows, userId);

    // Update last sync time
    await prisma.integration.updateMany({
      where: { provider: 'GOOGLE_SHEETS' },
      data: { lastSyncAt: new Date(), status: 'CONNECTED' },
    });

    return {
      ...result,
      spreadsheetId: targetSpreadsheetId,
      sheetName: targetSheetName,
      syncedAt: new Date(),
    };
  }
}

export const googleSheetsService = new GoogleSheetsService();
