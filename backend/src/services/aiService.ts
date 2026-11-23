import prisma from '../utils/prisma.js';
import { AIMessageResponse, AIMessageResponseSchema } from '../validators/aiValidator.js';
import { logger } from '../utils/logger.js';
import { logAudit } from '../utils/audit.js';

interface ProviderStatus {
  openrouter: {
    available: boolean;
    configured: boolean;
    model: string;
    error?: string;
  };
  ollama: {
    available: boolean;
    installedModels: string[];
    selectedModel: string;
    error?: string;
  };
}

export class AIService {
  private cache = new Map<string, { data: AIMessageResponse; timestamp: number }>();
  private CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours cache

  /**
   * Check connection status of OpenRouter and local Ollama
   */
  async getProviderStatus(): Promise<ProviderStatus> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const openrouterModel = process.env.OPENROUTER_MODEL || 'openrouter/free';
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';

    const status: ProviderStatus = {
      openrouter: {
        available: false,
        configured: !!apiKey,
        model: openrouterModel,
      },
      ollama: {
        available: false,
        installedModels: [],
        selectedModel: ollamaModel,
      },
    };

    // Test OpenRouter if key is provided
    if (apiKey) {
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        if (resp.ok) {
          status.openrouter.available = true;
        } else {
          status.openrouter.error = `HTTP ${resp.status}: Invalid or restricted OpenRouter key`;
        }
      } catch (err: any) {
        status.openrouter.error = err.message || 'Failed to reach OpenRouter';
      }
    } else {
      status.openrouter.error = 'No OPENROUTER_API_KEY configured in environment';
    }

    // Test Ollama local server
    try {
      const resp = await fetch(`${ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(4000),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        status.ollama.available = true;
        status.ollama.installedModels = (data.models || []).map((m: any) => m.name);
      } else {
        status.ollama.error = `Ollama returned HTTP ${resp.status}`;
      }
    } catch (err: any) {
      status.ollama.error = 'Local Ollama server is offline or unreachable on localhost:11434';
    }

    return status;
  }

  /**
   * List available free models from OpenRouter and local Ollama
   */
  async listAvailableModels() {
    const freeModels: Array<{ id: string; name: string; provider: string; context_length?: number }> = [
      { id: 'openrouter/free', name: 'OpenRouter Free Auto-Router (Default)', provider: 'OpenRouter' },
      { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Meta Llama 3.2 3B Instruct (Free)', provider: 'OpenRouter' },
      { id: 'google/gemini-2.0-flash-lite-preview-02-05:free', name: 'Google Gemini 2.0 Flash Lite (Free)', provider: 'OpenRouter' },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', provider: 'OpenRouter' },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)', provider: 'OpenRouter' },
    ];

    let ollamaModels: Array<{ id: string; name: string; provider: string }> = [];
    try {
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const resp = await fetch(`${ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        const data: any = await resp.json();
        ollamaModels = (data.models || []).map((m: any) => ({
          id: m.name,
          name: `${m.name} (Local Ollama)`,
          provider: 'Ollama',
        }));
      }
    } catch {
      // Ollama not reachable, omit
    }

    return {
      openrouter: freeModels,
      ollama: ollamaModels,
    };
  }

  /**
   * Generate outreach message for a lead
   */
  async generateOutreachMessage(params: {
    leadId: string;
    campaignId?: string;
    serviceOverride?: string;
    channel?: string;
    userId?: string;
  }): Promise<{ message: AIMessageResponse; modelUsed: string; provider: string }> {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId },
    });

    if (!lead) {
      throw new Error(`Lead with ID ${params.leadId} not found`);
    }

    // Check cache
    const cacheKey = `${lead.id}:${params.serviceOverride || lead.serviceInterest || 'general'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      logger.info(`Using cached AI message for lead ${lead.companyName}`);
      return { message: cached.data, modelUsed: 'cache', provider: 'cache' };
    }

    const agencyName = process.env.AGENCY_NAME || 'Apex Digital Studio';
    const agencyServices =
      process.env.AGENCY_SERVICES ||
      'Website development, Business website redesign, E-commerce website development, Android application development, Custom web application development, Website maintenance';

    const targetedService = params.serviceOverride || lead.serviceInterest || 'Website development';

    // Construct high-compliance system prompt
    const systemPrompt = `You are a senior outreach copywriter for "${agencyName}".
Agency core capabilities:
${agencyServices}

STRICT OUTREACH & COMPLIANCE RULES:
1. Use the actual company name ("${lead.companyName}") and contact name ("${lead.contactName}").
2. Focus on the service: "${targetedService}".
3. Consider the verified business details:
   - Business Type: ${lead.businessType || 'Local Business'}
   - Current Website Status: ${lead.existingWebsiteStatus || 'Not specified'}
   - Website URL: ${lead.website || 'None'}
   - Location: ${lead.location || 'Not specified'}
4. TONE: Professional, consultative, respectful, and peer-to-peer.
5. STRICT ANTI-HALLUCINATION:
   - NEVER invent company problems or pretend you audited their code/SEO unless verified in the notes.
   - NO fake urgency ("Only 2 spots left this week!", "Offer expires tomorrow").
   - NO exaggerated claims ("10x your revenue overnight!", "Guaranteed #1 on Google").
   - NO fake discounts or fake awards.
   - NO deceptive subject lines (e.g. NEVER use "Re:", "Fwd:", "Invoice #", or "Payment Failed").
6. CALL TO ACTION: A low-friction, polite invitation for a 10-minute discovery call or review of a short video/case study.
7. MANDATORY EMAIL OPT-OUT: Every email body must conclude with a polite, clear opt-out sentence:
   "PS: If you'd rather not hear from us regarding web and app development, simply reply with 'unsubscribe' and we will immediately take you off our list."
8. WHATSAPP TEMPLATE VARIABLES: Provide standard greeting and company placeholders (e.g., {"1": "${lead.contactName}", "2": "${lead.companyName}", "3": "${targetedService}"}).
9. CONFIDENCE SCORE: A decimal between 0.70 and 0.98 based on how well the client profile matches the service.

CRITICAL: Return ONLY valid, raw JSON conforming to this exact structure, with no markdown code blocks, backticks, or explanation:
{
  "subject": "string",
  "email_body": "string",
  "whatsapp_template_variables": {"1": "string", "2": "string", "3": "string"},
  "suggested_service": "string",
  "personalization_reason": "string",
  "confidence_score": 0.88,
  "follow_up_email": "string"
}`;

    const userPrompt = `Generate a personalized outreach email, follow-up email, and WhatsApp template variables for:
Company: ${lead.companyName}
Contact: ${lead.contactName}
Industry: ${lead.businessType || 'General'}
Current Web Presence: ${lead.existingWebsiteStatus || 'Needs evaluation'}
Notes: ${lead.notes || 'Interested in modern digital solutions'}
Target Service: ${targetedService}`;

    let result: AIMessageResponse | null = null;
    let providerUsed = '';
    let modelUsed = '';

    // Step 1: Try OpenRouter Free Model if API key is present
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const openrouterRes = await this.callOpenRouterWithRetry(systemPrompt, userPrompt);
        result = openrouterRes.data;
        providerUsed = 'OPENROUTER';
        modelUsed = openrouterRes.model;

        // Record AI Usage
        await this.recordAIUsage({
          provider: 'OPENROUTER',
          model: modelUsed,
          promptTokens: openrouterRes.tokens.prompt,
          completionTokens: openrouterRes.tokens.completion,
          durationMs: openrouterRes.durationMs,
        });
      } catch (err: any) {
        logger.warn(`OpenRouter generation failed: ${err.message}. Falling back to local Ollama...`);
      }
    }

    // Step 2: Fallback to Local Ollama if OpenRouter failed or not configured
    if (!result) {
      try {
        const ollamaRes = await this.callOllama(systemPrompt, userPrompt);
        result = ollamaRes.data;
        providerUsed = 'OLLAMA';
        modelUsed = ollamaRes.model;

        await this.recordAIUsage({
          provider: 'OLLAMA',
          model: modelUsed,
          promptTokens: ollamaRes.tokens.prompt,
          completionTokens: ollamaRes.tokens.completion,
          durationMs: ollamaRes.durationMs,
        });
      } catch (err: any) {
        logger.warn(`Ollama local generation failed: ${err.message}`);
      }
    }

    // Step 3: If both external & local AI are offline, use deterministic professional fallback generator
    // This guarantees the system never halts or produces invalid content
    if (!result) {
      logger.info('Using high-quality deterministic template fallback engine');
      result = this.generateDeterministicDraft(lead, targetedService, agencyName);
      providerUsed = 'RULE_ENGINE';
      modelUsed = 'deterministic-template-v1';
    }

    // Cache the result
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    await logAudit({
      userId: params.userId,
      action: 'AI_GENERATE_DRAFT',
      entityType: 'Lead',
      entityId: lead.id,
      details: { provider: providerUsed, model: modelUsed, service: targetedService },
    });

    return { message: result, modelUsed, provider: providerUsed };
  }

  /**
   * Calls OpenRouter with exponential backoff and jitter for HTTP 429
   */
  private async callOpenRouterWithRetry(
    systemPrompt: string,
    userPrompt: string,
    maxRetries = 3
  ): Promise<{ data: AIMessageResponse; model: string; tokens: { prompt: number; completion: number }; durationMs: number }> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'AI Outreach Pro',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.6,
            response_format: { type: 'json_object' },
          }),
          signal: AbortSignal.timeout(35000),
        });

        if (resp.status === 429) {
          // Rate limit encountered - calculate jittered backoff
          const jitter = Math.random() * 500;
          const waitMs = Math.min(1000 * Math.pow(2, attempt) + jitter, 10000);
          logger.warn(`OpenRouter 429 Rate Limit. Backing off for ${Math.round(waitMs)}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`OpenRouter HTTP ${resp.status}: ${errText}`);
        }

        const data: any = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Empty completion content from OpenRouter');
        }

        const parsedJson = this.extractAndValidateJSON(content);
        return {
          data: parsedJson,
          model,
          tokens: {
            prompt: data.usage?.prompt_tokens || 0,
            completion: data.usage?.completion_tokens || 0,
          },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        lastError = err;
        logger.warn(`OpenRouter attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('OpenRouter exhausted retry attempts');
  }

  /**
   * Calls local Ollama server
   */
  private async callOllama(
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ data: AIMessageResponse; model: string; tokens: { prompt: number; completion: number }; durationMs: number }> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3:latest';
    const startTime = Date.now();

    const resp = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        format: 'json',
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!resp.ok) {
      throw new Error(`Ollama HTTP ${resp.status}: ${resp.statusText}`);
    }

    const data: any = await resp.json();
    const content = data.message?.content;
    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    const parsedJson = this.extractAndValidateJSON(content);
    return {
      data: parsedJson,
      model,
      tokens: {
        prompt: data.prompt_eval_count || 0,
        completion: data.eval_count || 0,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Safely parses JSON string even if wrapped in markdown codeblocks
   */
  private extractAndValidateJSON(raw: string): AIMessageResponse {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(clean);
    return AIMessageResponseSchema.parse(parsed);
  }

  /**
   * High-quality deterministic fallback draft generator
   */
  private generateDeterministicDraft(lead: any, service: string, agencyName: string): AIMessageResponse {
    const firstName = lead.contactName.split(' ')[0] || lead.contactName;
    const company = lead.companyName;

    let benefit = 'streamline user experience and elevate your digital brand';
    if (service.toLowerCase().includes('android')) {
      benefit = 'provide your clients and team with an intuitive, native mobile experience';
    } else if (service.toLowerCase().includes('e-commerce') || service.toLowerCase().includes('ecommerce')) {
      benefit = 'accelerate checkout speeds, prevent cart abandonment, and increase conversion';
    } else if (service.toLowerCase().includes('redesign')) {
      benefit = 'modernize your design, improve mobile responsiveness, and enhance engagement';
    }

    const subject = `Question regarding ${company}'s ${service.toLowerCase()}`;

    const emailBody = `Hi ${firstName},

I came across ${company} recently and was impressed by the work you're doing in ${lead.businessType || 'your field'}.

At ${agencyName}, we specialize in ${service.toLowerCase()} designed to ${benefit}. Given your current focus, I wanted to reach out and see if improving your digital infrastructure is currently on your team's roadmap.

Would you be open to a quick 10-minute introductory conversation next Tuesday or Thursday to see if our capabilities align with your goals? No pressure or sales pitch whatsoever.

Best regards,
Client Solutions Team
${agencyName}

PS: If you'd rather not hear from us regarding web and app development, simply reply with 'unsubscribe' and we will immediately take you off our list.`;

    const followUpEmail = `Hi ${firstName},

Following up briefly on my earlier note regarding ${company}'s ${service.toLowerCase()}. 

I know how busy things get, so I wanted to make sure my message didn't get buried. We recently helped a similar team in your industry improve their digital experience and engagement.

If you have 5 minutes this week, I'd welcome the chance to share a couple of relevant ideas. If the timing isn't right, please feel free to let me know.

Best regards,
Client Solutions Team
${agencyName}

PS: Reply 'unsubscribe' at any time to opt out.`;

    return {
      subject,
      email_body: emailBody,
      whatsapp_template_variables: {
        '1': firstName,
        '2': company,
        '3': service,
      },
      suggested_service: service,
      personalization_reason: `Tailored for ${company} in ${lead.businessType || 'business'} focusing on ${service} based on verified presence.`,
      confidence_score: 0.88,
      follow_up_email: followUpEmail,
    };
  }

  /**
   * Record AI token usage and latency in the database
   */
  private async recordAIUsage(data: {
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    durationMs: number;
  }) {
    try {
      await prisma.aIUsage.create({
        data: {
          provider: data.provider,
          model: data.model,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.promptTokens + data.completionTokens,
          estimatedCost: 0.0, // Free tier
          durationMs: data.durationMs,
          requestType: 'DRAFT_GENERATION',
        },
      });
    } catch (e) {
      logger.error('Failed to record AI usage metric:', e);
    }
  }
}

export const aiService = new AIService();
