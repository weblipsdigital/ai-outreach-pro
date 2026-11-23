import { z } from 'zod';

export const AIMessageResponseSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  email_body: z.string().min(10, 'Email body must be at least 10 characters'),
  whatsapp_template_variables: z.record(z.string(), z.any()).default({}),
  suggested_service: z.string().min(2, 'Suggested service is required'),
  personalization_reason: z.string().min(5, 'Personalization reason is required'),
  confidence_score: z.number().min(0).max(1),
  follow_up_email: z.string().min(10, 'Follow up email draft is required'),
});

export type AIMessageResponse = z.infer<typeof AIMessageResponseSchema>;

export const AIGenerateRequestSchema = z.object({
  leadId: z.string().min(1),
  campaignId: z.string().optional(),
  serviceOverride: z.string().optional(),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'BOTH']).default('EMAIL'),
  temperature: z.number().min(0).max(1).default(0.7),
});
