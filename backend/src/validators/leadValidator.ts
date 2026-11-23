import { z } from 'zod';
import { normalizePhoneToE164 } from '../utils/phone.js';
import { sanitizeFormula } from '../utils/formulaSanitizer.js';

// Convert string truthy to boolean safely, defaulting strictly to false
const booleanConsentParser = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'opted_in';
  }
  return false;
}, z.boolean().default(false));

const dateParser = z.preprocess((val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}, z.date().nullable().optional());

export const LeadSchema = z.object({
  lead_id: z.string().min(1, 'lead_id is required').transform(sanitizeFormula),
  company_name: z.string().min(1, 'company_name is required').transform(sanitizeFormula),
  contact_name: z.string().min(1, 'contact_name is required').transform(sanitizeFormula),
  business_type: z.string().nullable().optional().transform((val) => val ? sanitizeFormula(val) : null),
  email: z.string().email('Invalid email address').transform((val) => val.trim().toLowerCase()),
  phone: z.string().nullable().optional().transform((val) => normalizePhoneToE164(val)),
  website: z.string().nullable().optional().transform((val) => val ? sanitizeFormula(val) : null),
  location: z.string().nullable().optional().transform((val) => val ? sanitizeFormula(val) : null),
  existing_website_status: z.string().nullable().optional().transform((val) => val ? sanitizeFormula(val) : null),
  service_interest: z.string().nullable().optional().transform((val) => val ? sanitizeFormula(val) : null),
  email_permission: booleanConsentParser,
  whatsapp_opt_in: booleanConsentParser,
  consent_source: z.string().nullable().optional().transform((val) => val ? sanitizeFormula(val) : null),
  consent_timestamp: dateParser,
  notes: z.string().nullable().optional().transform((val) => val ? sanitizeFormula(val) : null),
});

export const LeadUpdateSchema = LeadSchema.partial().omit({ email: true, lead_id: true }).extend({
  status: z.enum([
    'NEW',
    'DRAFTED',
    'CONTACTED',
    'REPLIED',
    'INTERESTED',
    'MEETING_REQUESTED',
    'NOT_INTERESTED',
    'UNSUBSCRIBED',
    'CLOSED'
  ]).optional(),
  emailStatus: z.enum(['ACTIVE', 'BOUNCED', 'UNSUBSCRIBED', 'COMPLAINED']).optional(),
  whatsappStatus: z.enum(['ACTIVE', 'OPTED_OUT', 'FAILED']).optional(),
});

export type LeadInput = z.infer<typeof LeadSchema>;
export type LeadUpdateInput = z.infer<typeof LeadUpdateSchema>;
