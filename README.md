# AI Outreach Pro

> **Automated, Compliant, Free-First Client Outreach Platform for Website Development & Android Application Agencies.**

AI Outreach Pro imports verified business prospects from Google Sheets, generates hyper-personalized cold outreach pitches using **100% Free AI models** (OpenRouter free models or offline local Ollama), manages multi-touch email (Gmail API) and WhatsApp (Meta Cloud API) campaigns, monitors inbox replies, and automates follow-ups.

---

## Highlights & Features

- **100% Free AI Inference**: Uses OpenRouter free models (`openrouter/free`, `llama-3.2-3b-instruct:free`, `gemini-2.0-flash-lite:free`) by default, with an offline local **Ollama** fallback.
- **Zero Cost & Dry-Run Default**: `DRY_RUN=true` out of the box. Safe simulated execution without unexpected fees.
- **No Unofficial WhatsApp Bots**: Uses only the official **Meta WhatsApp Business Cloud API** with a hard `$0.00` spend limit.
- **Gmail API Integration**: Free OAuth 2.0 Gmail integration for sending outreach, tracking threads, and detecting client replies.
- **Google Sheets Synchronization**: Real-time sync with phone normalization to E.164, duplicate detection, and formula injection sanitization.
- **Strict Consent Enforcement**: Never interprets empty cells as consent. Preserves opt-out and suppression status.
- **Smart Follow-up Automation**: Multi-touch sequences (Day 0 &rarr; Day 4 &rarr; Day 9) with instant auto-cancellation upon reply or opt-out.
- **Modern SaaS Dashboard**: 13 responsive pages with dark/light mode, Recharts analytics, and toast notifications.
- **Local SQLite Database**: Self-contained Prisma SQLite storage with complete audit logging and transaction-safe send locks.

---

## Dashboard Pages

1. **Overview**: Executive pipeline KPIs, daily dispatch timeline, services in demand pie chart, and recent audit activity.
2. **Leads**: Complete prospect table with search, consent badges, status tags, CSV import, and single-lead generation.
3. **Google Sheets**: Spreadsheet ID connector, worksheet tab selector, live row preview, and sync controls.
4. **AI Message Generator**: Model picker (OpenRouter Free vs Ollama), target capability pitch, live confidence score, anti-hallucination rules, and email/WhatsApp draft previews.
5. **Email Campaigns**: Campaign list, daily cap configuration, start/pause controls, and recipient stats.
6. **WhatsApp Campaigns**: Official Meta Cloud API templates, variable mapping (`{{1}}`, `{{2}}`), and spend limit tracker.
7. **Message Approval Queue**: Two-click review, inline subject/body editor, reject, single approve, and bulk approve.
8. **Follow-ups**: Visual Day 0 &rarr; Day 4 &rarr; Day 9 sequence timeline, active scheduled jobs, and "Process Due Follow-ups Now".
9. **Inbox**: Unified Gmail and WhatsApp conversation view with thread history, status updater, and manual reply box.
10. **Analytics**: Real database metrics, conversion funnel bar charts, channel breakdown, and suppression counts.
11. **Automation Settings**: Master switches (`DRY_RUN`, `AUTO_APPROVE`, `AUTO_SEND`, `WHATSAPP_SEND_ENABLED`), daily send caps, and **EMERGENCY STOP**.
12. **API Integrations**: OpenRouter, local Ollama, Google OAuth Gmail API, and Meta WhatsApp Cloud configuration.
13. **Activity Logs**: Immutable audit trail showing timestamp, operator, action, entity, and JSON details.

---

## Windows Installation & Quick Start Guide

### Prerequisites

1. **Node.js**: Version 18, 20, 22, or 26. (Verify with `node -v` in PowerShell).
2. **Git** (optional): For version control.

---

### Step 1: Open Terminal in Project Directory

Open **PowerShell** or **Command Prompt** in `d:\outreach` (or your project directory).

---

### Step 2: Configure Environment Variables

Create `.env` inside `backend/`:

```powershell
copy .env.example backend\.env
```

The default values are configured for immediate safe local execution:
- `DRY_RUN=true` (Zero cost simulation)
- `DATABASE_URL="file:./dev.db"`
- `ADMIN_EMAIL=admin@aioutreachpro.local`
- `ADMIN_PASSWORD=Admin@Outreach2026!`
- `OPENROUTER_MODEL=openrouter/free`

---

### Step 3: Install Dependencies

```powershell
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ..\frontend
npm install
cd ..
```

---

### Step 4: Initialize and Seed SQLite Database

```powershell
# In the backend directory:
cd backend
npx prisma db push
npm run db:seed
cd ..
```

This seeds:
- Default Admin account: `admin@aioutreachpro.local` / `Admin@Outreach2026!`
- Default system settings and compliance rules
- 5 realistic sample agency business leads with explicit consent records
- Sample Q4 Website Redesign outreach campaign

---

### Step 5: Start the Platform

Run both backend and frontend concurrently:

```powershell
npm run dev
```

- **Backend API**: `http://localhost:5000`
- **Frontend Dashboard**: `http://localhost:5173`

Open your browser to `http://localhost:5173` and log in with:
- **Email**: `admin@aioutreachpro.local`
- **Password**: `Admin@Outreach2026!`

---

## Connecting External Services (Optional)

### Free OpenRouter AI
1. Get a free API key at [OpenRouter.ai](https://openrouter.ai).
2. Add your key in `backend/.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-...
   OPENROUTER_MODEL=openrouter/free
   ```
3. Or select any free model in the UI (e.g. `meta-llama/llama-3.2-3b-instruct:free`, `google/gemini-2.0-flash-lite-preview-02-05:free`).
4. If no key is provided, the platform automatically utilizes its high-compliance deterministic fallback engine.

### Local Ollama Fallback (100% Free & Offline)
1. Download Ollama from [ollama.com](https://ollama.com).
2. Pull a local model:
   ```powershell
   ollama run llama3
   ```
3. AI Outreach Pro will automatically detect the local model on `http://localhost:11434`.

### Gmail API (OAuth 2.0)
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create a project and enable **Gmail API** and **Google Sheets API**.
3. Create OAuth 2.0 Credentials:
   - Authorized redirect URI: `http://localhost:5000/api/integrations/google/callback`
4. Add credentials to `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/google/callback
   ```
5. Click **"Connect Gmail with Google OAuth"** under **API Integrations** in the dashboard.

---

## Testing

Run the automated test suite:

```powershell
cd backend
npm test
```

### Verified Test Suites:
- `tests/leadValidation.test.ts`: Strict consent parsing, E.164 phone normalization, formula injection defense.
- `tests/aiValidationAndFallback.test.ts`: Structured JSON validation, anti-hallucination rules, unsubscribe footers.
- `tests/consentAndSuppression.test.ts`: Re-import deduplication and suppression list preservation.
- `tests/sendingAndCompliance.test.ts`: Centralized send dispatcher, daily send caps, dry-run mode, and follow-up creation.
- `tests/authAndSecurity.test.ts`: Bcrypt password hashing, JWT signing and token tampering rejection.

---

## Troubleshooting Guide (Windows Localhost)

| Issue | Cause | Fix |
|---|---|---|
| Port 5000 in use | Another service is using port 5000 | Change `PORT=5001` in `backend/.env` and update proxy in `frontend/vite.config.ts`. |
| `prisma db push` EPERM | SQLite database locked by active process | Stop running server processes and re-run `npx prisma db push`. |
| OpenRouter HTTP 429 | Rate limit reached on free tier | The system automatically applies exponential backoff with jitter and falls back to Ollama or template engine. |
| Google OAuth redirect mismatch | Redirect URI in Google Cloud Console doesn't match | Ensure `http://localhost:5000/api/integrations/google/callback` is listed under Authorized Redirect URIs in Google Cloud Console. |
| Emails not dispatching | System is in Dry-Run mode | Check top banner. If in DRY-RUN mode, messages are simulated safely. Toggle in **Automation Settings** when ready. |

---

## License

MIT License. Open-source and free for commercial and agency client acquisition.
