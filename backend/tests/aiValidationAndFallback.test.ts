import { describe, it, expect } from 'vitest';
import { AIMessageResponseSchema } from '../src/validators/aiValidator.js';
import { aiService } from '../src/services/aiService.js';
import prisma from '../src/utils/prisma.js';

describe('AI Output Validation & Fallback Rules', () => {
  it('validates strictly structured AI response JSON', () => {
    const validResponse = {
      subject: 'Modern web development for Apex Corp',
      email_body: 'Hi Jane, we would love to help Apex Corp modernize your customer checkout. PS: Reply unsubscribe anytime.',
      whatsapp_template_variables: { '1': 'Jane', '2': 'Apex Corp' },
      suggested_service: 'E-commerce website development',
      personalization_reason: 'Client has existing slow WooCommerce store',
      confidence_score: 0.92,
      follow_up_email: 'Hi Jane, following up briefly regarding our earlier note. PS: Reply unsubscribe anytime.',
    };

    const parsed = AIMessageResponseSchema.parse(validResponse);
    expect(parsed.confidence_score).toBe(0.92);
    expect(parsed.subject).toContain('Apex Corp');
  });

  it('rejects invalid or missing structured JSON from AI', () => {
    const invalidResponse = {
      subject: 'Incomplete',
      // missing email_body, suggested_service, etc.
    };

    expect(() => AIMessageResponseSchema.parse(invalidResponse)).toThrow();
  });

  it('deterministic fallback generates high-compliance pitch with mandatory unsubscribe footer', async () => {
    const createdLead = await prisma.lead.create({
      data: {
        leadId: `TEST-FALLBACK-${Date.now()}`,
        companyName: 'Starlight Retail',
        contactName: 'David Lee',
        businessType: 'Retail Boutique',
        email: `david_${Date.now()}@starlight.demo`,
        phone: '+14155558899',
        existingWebsiteStatus: 'Outdated design',
        serviceInterest: 'Business website redesign',
        emailPermission: true,
        whatsappOptIn: false,
      },
    });

    const result = await aiService.generateOutreachMessage({
      leadId: createdLead.id,
      serviceOverride: 'Business website redesign',
    });

    expect(result.message).toBeDefined();
    expect(result.message.subject).toBeDefined();
    expect(result.message.email_body).toContain('Starlight Retail');
    // Verify anti-spam unsubscribe footer is present
    expect(result.message.email_body.toLowerCase()).toContain('unsubscribe');
    expect(result.message.confidence_score).toBeGreaterThanOrEqual(0.7);
  });
});
