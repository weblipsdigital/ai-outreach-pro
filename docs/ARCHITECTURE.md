# AI Outreach Pro — Architecture & Security Blueprint

## 1. System Architecture Diagram

```
 +-------------------------------------------------------------------------+
 |                              Browser UI                                 |
 |        React 18 + Vite + TypeScript + Tailwind CSS + Recharts           |
 +------------------------------------+------------------------------------+
                                      | HTTP REST / JSON
                                      v
 +-------------------------------------------------------------------------+
 |                     Express.js Backend API (Node.js)                    |
 |                                                                         |
 |  [Auth Middleware] -> [Rate Limiter] -> [Formula Injection Defense]    |
 |                                                                         |
 |  Routes & Controllers:                                                  |
 |  - Leads & Sheets Controller                                            |
 |  - AI Generator Controller                                              |
 |  - Message Approval Controller                                          |
 |  - Centralized Send Dispatcher (Compliance, Quota, Consent Guardrails)  |
 |  - Follow-up Automation Engine                                          |
 |  - Unified Inbox & Webhook Signature Verifier                           |
 +------------------+-------------------+--------------------+-------------+
                    |                   |                    |
                    v                   v                    v
      +-------------------+   +------------------+   +---------------------+
      |   Prisma ORM     |   |   Free AI Router |   | External Channels   |
      |   SQLite (Local)  |   |                  |   |                     |
      |                   |   | 1. OpenRouter    |   | 1. Gmail API (OAuth)|
      | - Lead & Consent  |   |    Free tier     |   | 2. Meta WhatsApp    |
      | - GeneratedMessage|   | 2. Local Ollama  |   |    Cloud API        |
      | - SendJob (Lock)  |   |    (Offline)     |   |    ($0.00 Spend Cap)|
      | - FollowUp Engine |   | 3. Deterministic |   | 3. Google Sheets    |
      | - AuditLog        |   |    Engine        |   |    API v4           |
      +-------------------+   +------------------+   +---------------------+
```

---

## 2. Security Safeguards

### A. Formula & Spreadsheet Macro Injection Defense
Any incoming data from Google Sheets or CSV files is sanitized via `sanitizeFormula()`. Characters like `=`, `+`, `-`, and `@` are automatically escaped with single quotes to prevent executable macro exploits in Excel or LibreOffice.

### B. Anti-Hallucination Prompt Rules
- Outreach drafts strictly reference verified company details.
- Prohibits fake audits ("We ran an audit on your website and found 15 bugs").
- Prohibits fake discounts, fake urgency, and deceptive email subjects (`Re:`, `Fwd:`, `Invoice`).
- Appends mandatory unsubscribe disclaimer to every email.

### C. Zero-Cost & Dry-Run Safety Rails
- Default: `DRY_RUN=true`
- WhatsApp spending limit locked at `$0.00`.
- All delivery events in Dry-Run mode simulate delivery and record metrics without charging APIs or spamming real mailboxes.

### D. Token Encryption at Rest
- Sensitive Google OAuth tokens and WhatsApp system access tokens are encrypted using AES-256-GCM before writing to the SQLite database.
- Encryption keys are loaded strictly from environment variables.

### E. Idempotency & Concurrency Locking
- Before dispatching a message, `SendJob` acquires a database row lock (`status = 'PROCESSING', lockedAt = now()`).
- Database-enforced unique idempotency keys guarantee that concurrent cron jobs or worker restarts never duplicate messages.
