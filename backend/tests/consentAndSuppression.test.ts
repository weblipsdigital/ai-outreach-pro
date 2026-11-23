import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/utils/prisma.js';
import { leadService } from '../src/services/leadService.js';

describe('Consent & Suppression List Enforcement', () => {
  const testEmail = `test_suppress_${Date.now()}@example.com`;

  it('preserves suppression status when lead re-imported', async () => {
    // 1. Add email to suppression list (user opted out)
    await prisma.suppressionList.upsert({
      where: { identifier: testEmail },
      update: {},
      create: {
        identifier: testEmail,
        channel: 'EMAIL',
        reason: 'OPT_OUT',
        notes: 'User requested unsubscribe',
      },
    });

    // 2. Attempt to import lead claiming email_permission = true
    const importPayload = [
      {
        lead_id: `L-SUPP-${Date.now()}`,
        company_name: 'Suppressed Client LLC',
        contact_name: 'John Doe',
        email: testEmail,
        email_permission: 'true',
        whatsapp_opt_in: 'false',
      },
    ];

    const result = await leadService.importLeads(importPayload);
    expect(result.createdCount).toBe(1);

    // 3. Verify that database record overrides input and marks emailPermission = false & status = UNSUBSCRIBED
    const leadInDb = await prisma.lead.findUnique({
      where: { email: testEmail },
    });

    expect(leadInDb).toBeDefined();
    expect(leadInDb?.emailPermission).toBe(false);
    expect(leadInDb?.status).toBe('UNSUBSCRIBED');
  });

  it('updates existing lead details without resetting status', async () => {
    const updateEmail = `test_update_${Date.now()}@example.com`;
    const leadId = `L-UPD-${Date.now()}`;

    // Create lead
    await leadService.importLeads([
      {
        lead_id: leadId,
        company_name: 'Initial Company Name',
        contact_name: 'Alice',
        email: updateEmail,
        email_permission: 'true',
      },
    ]);

    // Change status to CONTACTED
    await prisma.lead.update({
      where: { email: updateEmail },
      data: { status: 'CONTACTED' },
    });

    // Re-import with updated company name
    await leadService.importLeads([
      {
        lead_id: leadId,
        company_name: 'Updated Company Name Ltd',
        contact_name: 'Alice Cooper',
        email: updateEmail,
        email_permission: 'true',
      },
    ]);

    const refreshed = await prisma.lead.findUnique({
      where: { email: updateEmail },
    });

    expect(refreshed?.companyName).toBe('Updated Company Name Ltd');
    expect(refreshed?.contactName).toBe('Alice Cooper');
    expect(refreshed?.status).toBe('CONTACTED'); // Preserved status!
  });
});
