import { describe, it, expect } from 'vitest';
import prisma from '../src/utils/prisma.js';
import { sendDispatcher } from '../src/services/sendDispatcher.js';

describe('Sending Limits, Idempotency & Compliance Safety', () => {
  it('blocks sending to leads without consent', async () => {
    const noConsentEmail = `no_consent_${Date.now()}@example.com`;

    const lead = await prisma.lead.create({
      data: {
        leadId: `NC-${Date.now()}`,
        companyName: 'No Consent Corp',
        contactName: 'Mark',
        email: noConsentEmail,
        emailPermission: false, // Explicit false
        status: 'NEW',
      },
    });

    const msg = await prisma.generatedMessage.create({
      data: {
        leadId: lead.id,
        channel: 'EMAIL',
        subject: 'Inquiry',
        emailBody: 'Hello...',
        suggestedService: 'Web Dev',
        personalizationReason: 'Test',
        confidenceScore: 0.8,
        status: 'APPROVED',
      },
    });

    // Attempt to send
    await expect(sendDispatcher.sendApprovedMessage(msg.id)).rejects.toThrow(
      /explicit email consent/
    );
  });

  it('runs safely in DRY-RUN mode without sending real emails', async () => {
    const dryRunEmail = `dry_run_${Date.now()}@example.com`;

    // Ensure DRY_RUN is set to true
    await prisma.systemSetting.upsert({
      where: { key: 'DRY_RUN' },
      update: { value: 'true' },
      create: { key: 'DRY_RUN', value: 'true' },
    });

    const lead = await prisma.lead.create({
      data: {
        leadId: `DR-${Date.now()}`,
        companyName: 'Dry Run Systems',
        contactName: 'Chloe',
        email: dryRunEmail,
        emailPermission: true,
        status: 'NEW',
      },
    });

    const msg = await prisma.generatedMessage.create({
      data: {
        leadId: lead.id,
        channel: 'EMAIL',
        subject: 'Web redesign proposal for Dry Run Systems',
        emailBody: 'Hi Chloe, we propose a redesign. PS: Reply unsubscribe anytime.',
        suggestedService: 'Business website redesign',
        personalizationReason: 'Test dry run',
        confidenceScore: 0.9,
        followUpEmail: 'Following up. PS: Reply unsubscribe.',
        status: 'APPROVED',
      },
    });

    const result = await sendDispatcher.sendApprovedMessage(msg.id);

    expect(result.success).toBe(true);
    expect(result.isDryRun).toBe(true);
    expect(result.providerMessageId).toContain('sim-email-');

    // Verify lead status updated to CONTACTED
    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updatedLead?.status).toBe('CONTACTED');

    // Verify follow-up was automatically scheduled
    const followUps = await prisma.followUp.findMany({ where: { leadId: lead.id } });
    expect(followUps.length).toBe(2); // Day 4 & Day 9
  });
});
