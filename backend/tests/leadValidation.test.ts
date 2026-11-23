import { describe, it, expect } from 'vitest';
import { LeadSchema } from '../src/validators/leadValidator.js';
import { normalizePhoneToE164, isValidE164 } from '../src/utils/phone.js';
import { sanitizeFormula } from '../src/utils/formulaSanitizer.js';

describe('Lead Validation & Normalization', () => {
  it('should accept valid lead record and parse properly', () => {
    const raw = {
      lead_id: 'L-101',
      company_name: 'Metro Tech Dental',
      contact_name: 'Dr. Sarah Smith',
      business_type: 'Dental Practice',
      email: 'SARAH@MetroDental.com',
      phone: '4155551234',
      existing_website_status: 'Slow & non-responsive',
      service_interest: 'Website development',
      email_permission: 'true',
      whatsapp_opt_in: 'false',
    };

    const parsed = LeadSchema.parse(raw);
    expect(parsed.email).toBe('sarah@metrodental.com'); // lowercased
    expect(parsed.phone).toBe('+14155551234'); // normalized to E.164
    expect(parsed.email_permission).toBe(true);
    expect(parsed.whatsapp_opt_in).toBe(false);
  });

  it('strict consent rule: never interpret empty or missing consent as permission', () => {
    const rawWithEmptyConsent = {
      lead_id: 'L-102',
      company_name: 'Alpha Construction',
      contact_name: 'Bob Builder',
      email: 'bob@alpha.com',
      email_permission: '',
      whatsapp_opt_in: null,
    };

    const parsed = LeadSchema.parse(rawWithEmptyConsent);
    expect(parsed.email_permission).toBe(false);
    expect(parsed.whatsapp_opt_in).toBe(false);

    // Missing fields altogether
    const rawMissing = {
      lead_id: 'L-103',
      company_name: 'Alpha 2',
      contact_name: 'Alice',
      email: 'alice@alpha.com',
    };
    const parsedMissing = LeadSchema.parse(rawMissing);
    expect(parsedMissing.email_permission).toBe(false);
    expect(parsedMissing.whatsapp_opt_in).toBe(false);
  });

  it('normalizes various phone formats to E.164', () => {
    expect(normalizePhoneToE164('(555) 234-5678')).toBe('+15552345678');
    expect(normalizePhoneToE164('+44 20 7946 0991')).toBe('+442079460991');
    expect(normalizePhoneToE164('00442079460991')).toBe('+442079460991');
    expect(normalizePhoneToE164('invalid-phone')).toBeNull();
    expect(normalizePhoneToE164('')).toBeNull();
  });

  it('defends against CSV/Spreadsheet formula injection', () => {
    expect(sanitizeFormula('=cmd|"/c calc"!A0')).toBe('\'=cmd|"/c calc"!A0');
    expect(sanitizeFormula('+123456')).toBe('\'+123456');
    expect(sanitizeFormula('-2+5')).toBe('\'-2+5');
    expect(sanitizeFormula('@SUM(1,2)')).toBe('\'@SUM(1,2)');
    expect(sanitizeFormula('Safe Normal Company')).toBe('Safe Normal Company');
  });
});
