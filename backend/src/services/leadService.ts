import prisma from '../utils/prisma.js';
import { LeadSchema, LeadInput, LeadUpdateInput } from '../validators/leadValidator.js';
import { logAudit } from '../utils/audit.js';
import { logger } from '../utils/logger.js';

export interface ImportResult {
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  suppressedCount: number;
  errors: Array<{ row: number; leadId?: string; email?: string; error: string }>;
}

export class LeadService {
  /**
   * Process a list of raw records (from CSV or Google Sheets)
   */
  async importLeads(rawRows: any[], userId?: string): Promise<ImportResult> {
    const result: ImportResult = {
      totalProcessed: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      suppressedCount: 0,
      errors: [],
    };

    // Pre-fetch suppression list for rapid checking
    const suppressions = await prisma.suppressionList.findMany({
      select: { identifier: true, channel: true },
    });
    const suppressionSet = new Set(suppressions.map((s) => s.identifier.toLowerCase()));

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      result.totalProcessed++;

      // 1. Validate record using Zod
      const parseResult = LeadSchema.safeParse(row);
      if (!parseResult.success) {
        result.errors.push({
          row: i + 1,
          leadId: row.lead_id || undefined,
          email: row.email || undefined,
          error: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        });
        result.skippedCount++;
        continue;
      }

      const validData: LeadInput = parseResult.data;
      const normalizedEmail = validData.email.toLowerCase();

      try {
        // 2. Check if contact is suppressed
        const isEmailSuppressed = suppressionSet.has(normalizedEmail);
        const isPhoneSuppressed = validData.phone ? suppressionSet.has(validData.phone) : false;

        // 3. Find if lead exists already by lead_id or email
        const existingLead = await prisma.lead.findFirst({
          where: {
            OR: [
              { leadId: validData.lead_id },
              { email: normalizedEmail },
            ],
          },
        });

        if (existingLead) {
          // If existing lead is marked UNSUBSCRIBED, preserve suppression
          const preserveUnsubscribed =
            existingLead.status === 'UNSUBSCRIBED' ||
            existingLead.emailStatus === 'UNSUBSCRIBED' ||
            isEmailSuppressed;

          const emailPermission = preserveUnsubscribed ? false : validData.email_permission;
          const whatsappOptIn =
            existingLead.whatsappStatus === 'OPTED_OUT' || isPhoneSuppressed
              ? false
              : validData.whatsapp_opt_in;

          // Update record without resetting active campaign history or suppression
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              companyName: validData.company_name,
              contactName: validData.contact_name,
              businessType: validData.business_type || existingLead.businessType,
              phone: validData.phone || existingLead.phone,
              website: validData.website || existingLead.website,
              location: validData.location || existingLead.location,
              existingWebsiteStatus: validData.existing_website_status || existingLead.existingWebsiteStatus,
              serviceInterest: validData.service_interest || existingLead.serviceInterest,
              emailPermission,
              whatsappOptIn,
              notes: validData.notes
                ? existingLead.notes
                  ? `${existingLead.notes} | ${validData.notes}`
                  : validData.notes
                : existingLead.notes,
              // Never revert UNSUBSCRIBED status
              status: preserveUnsubscribed ? 'UNSUBSCRIBED' : existingLead.status,
            },
          });

          result.updatedCount++;
        } else {
          // Create new Lead
          const emailPermission = isEmailSuppressed ? false : validData.email_permission;
          const whatsappOptIn = isPhoneSuppressed ? false : validData.whatsapp_opt_in;

          const newLead = await prisma.lead.create({
            data: {
              leadId: validData.lead_id,
              companyName: validData.company_name,
              contactName: validData.contact_name,
              businessType: validData.business_type,
              email: normalizedEmail,
              phone: validData.phone,
              website: validData.website,
              location: validData.location,
              existingWebsiteStatus: validData.existing_website_status,
              serviceInterest: validData.service_interest,
              emailPermission,
              whatsappOptIn,
              consentSource: validData.consent_source,
              consentTimestamp: validData.consent_timestamp,
              notes: validData.notes,
              status: isEmailSuppressed ? 'UNSUBSCRIBED' : 'NEW',
            },
          });

          // Record explicit consent history
          if (emailPermission) {
            await prisma.consentRecord.create({
              data: {
                leadId: newLead.id,
                channel: 'EMAIL',
                consentGiven: true,
                consentSource: validData.consent_source,
                timestamp: validData.consent_timestamp || new Date(),
              },
            });
          }

          if (whatsappOptIn) {
            await prisma.consentRecord.create({
              data: {
                leadId: newLead.id,
                channel: 'WHATSAPP',
                consentGiven: true,
                consentSource: validData.consent_source,
                timestamp: validData.consent_timestamp || new Date(),
              },
            });
          }

          if (isEmailSuppressed || isPhoneSuppressed) {
            result.suppressedCount++;
          }

          result.createdCount++;
        }
      } catch (err: any) {
        logger.error(`Error importing row ${i + 1}:`, err);
        result.errors.push({
          row: i + 1,
          leadId: validData.lead_id,
          email: validData.email,
          error: err.message || 'Database error while saving lead',
        });
        result.skippedCount++;
      }
    }

    await logAudit({
      userId,
      action: 'IMPORT_LEADS',
      entityType: 'Lead',
      details: {
        total: result.totalProcessed,
        created: result.createdCount,
        updated: result.updatedCount,
        skipped: result.skippedCount,
      },
    });

    return result;
  }

  /**
   * Get paginated leads with filtering
   */
  async getLeads(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    serviceInterest?: string;
    hasEmailPermission?: boolean;
    hasWhatsAppOptIn?: boolean;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search } },
        { contactName: { contains: query.search } },
        { email: { contains: query.search } },
        { leadId: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.serviceInterest) {
      where.serviceInterest = { contains: query.serviceInterest };
    }

    if (typeof query.hasEmailPermission === 'boolean') {
      where.emailPermission = query.hasEmailPermission;
    }

    if (typeof query.hasWhatsAppOptIn === 'boolean') {
      where.whatsappOptIn = query.hasWhatsAppOptIn;
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          consentRecords: { take: 5, orderBy: { timestamp: 'desc' } },
          _count: { select: { generatedMessages: true, conversations: true } },
        },
      }),
    ]);

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update lead details and handle suppression/unsubscribes
   */
  async updateLead(id: string, data: LeadUpdateInput, userId?: string) {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Lead not found');
    }

    // If changing status to UNSUBSCRIBED, add to suppression list
    if (data.status === 'UNSUBSCRIBED' || data.emailStatus === 'UNSUBSCRIBED') {
      await prisma.suppressionList.upsert({
        where: { identifier: existing.email.toLowerCase() },
        update: { reason: 'OPT_OUT' },
        create: {
          identifier: existing.email.toLowerCase(),
          channel: 'EMAIL',
          reason: 'OPT_OUT',
          notes: 'Marked unsubscribed from lead management',
        },
      });
      data.email_permission = false;
    }

    if (data.whatsappStatus === 'OPTED_OUT' && existing.phone) {
      await prisma.suppressionList.upsert({
        where: { identifier: existing.phone },
        update: { reason: 'OPT_OUT' },
        create: {
          identifier: existing.phone,
          channel: 'WHATSAPP',
          reason: 'OPT_OUT',
          notes: 'Marked opted out from lead management',
        },
      });
      data.whatsapp_opt_in = false;
    }

    const {
      company_name,
      contact_name,
      business_type,
      existing_website_status,
      service_interest,
      email_permission,
      whatsapp_opt_in,
      consent_source,
      consent_timestamp,
      ...directFields
    } = data;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...directFields,
        ...(company_name ? { companyName: company_name } : {}),
        ...(contact_name ? { contactName: contact_name } : {}),
        ...(business_type !== undefined ? { businessType: business_type } : {}),
        ...(existing_website_status !== undefined ? { existingWebsiteStatus: existing_website_status } : {}),
        ...(service_interest !== undefined ? { serviceInterest: service_interest } : {}),
        ...(email_permission !== undefined ? { emailPermission: email_permission } : {}),
        ...(whatsapp_opt_in !== undefined ? { whatsappOptIn: whatsapp_opt_in } : {}),
        ...(consent_source !== undefined ? { consentSource: consent_source } : {}),
        ...(consent_timestamp !== undefined ? { consentTimestamp: consent_timestamp } : {}),
      },
    });

    await logAudit({
      userId,
      action: 'UPDATE_LEAD',
      entityType: 'Lead',
      entityId: id,
      details: data,
    });

    return updated;
  }

  /**
   * Delete lead
   */
  async deleteLead(id: string, userId?: string) {
    const deleted = await prisma.lead.delete({ where: { id } });
    await logAudit({
      userId,
      action: 'DELETE_LEAD',
      entityType: 'Lead',
      entityId: id,
      details: { email: deleted.email, companyName: deleted.companyName },
    });
    return deleted;
  }
}

export const leadService = new LeadService();
