# AI Outreach Pro — API Documentation

Base URL: `http://localhost:5000/api`

All administrative endpoints require a Bearer token in the request header:
`Authorization: Bearer <TOKEN>`

---

## 1. Authentication

### `POST /auth/login`
Authenticates local administrator.
- **Request Body**:
  ```json
  {
    "email": "admin@aioutreachpro.local",
    "password": "Admin@Outreach2026!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": { "id": "cuid...", "email": "admin@...", "name": "...", "role": "ADMIN" }
  }
  ```

### `POST /auth/logout`
Terminates session.

### `GET /auth/me`
Retrieves current authenticated admin session.

---

## 2. Lead Management

### `GET /leads`
Paginated search and filter for business prospects.
- **Query Parameters**:
  - `page`: default 1
  - `limit`: default 20 (max 100)
  - `search`: company name, contact, email, or lead ID
  - `status`: `NEW`, `DRAFTED`, `CONTACTED`, `REPLIED`, `INTERESTED`, `MEETING_REQUESTED`, `UNSUBSCRIBED`, etc.
  - `hasEmailPermission`: `true` | `false`
  - `hasWhatsAppOptIn`: `true` | `false`

### `POST /leads`
Creates a single prospect lead with strict consent checks and formula injection defense.
- **Request Body**:
  ```json
  {
    "lead_id": "LEAD-101",
    "company_name": "Apex Dental",
    "contact_name": "Dr. Sarah",
    "email": "sarah@apexdental.example",
    "phone": "+14155551234",
    "existing_website_status": "Outdated & slow",
    "service_interest": "Website development",
    "email_permission": true,
    "whatsapp_opt_in": false,
    "consent_source": "Website Inbound Form",
    "notes": "Needs mobile responsive redesign"
  }
  ```

### `PATCH /leads/:id`
Updates lead fields. Automatically adds lead to `SuppressionList` if status is changed to `UNSUBSCRIBED`.

### `DELETE /leads/:id`
Deletes lead and cascades related generated records.

### `POST /leads/batch`
Imports a batch array of lead records (e.g., from CSV).

---

## 3. Google Sheets Integration

### `GET /sheets/status`
Returns sheet connection and sync status.

### `POST /sheets/connect`
Configures target spreadsheet ID and worksheet tab name.

### `POST /sheets/preview`
Reads the first 5 rows of the connected spreadsheet without importing.

### `POST /sheets/sync`
Performs immediate synchronization, phone E.164 normalization, deduplication, and formula sanitization.

---

## 4. AI Engine & Message Generation

### `GET /ai/status`
Returns connection status for OpenRouter free tier and local Ollama server.

### `GET /ai/models`
Lists available free models (e.g. `openrouter/free`, `llama-3.2-3b:free`, `gemini-2.0-flash-lite:free`, and local Ollama models).

### `POST /ai/generate`
Generates hyper-personalized outreach draft adhering to anti-hallucination rules and mandatory opt-out footers.
- **Request Body**:
  ```json
  {
    "leadId": "cuid...",
    "serviceOverride": "Business website redesign"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "cuid...",
    "subject": "Modern website redesign for Apex Dental",
    "emailBody": "...",
    "whatsappTemplateVariables": { "1": "Sarah", "2": "Apex Dental" },
    "suggestedService": "Business website redesign",
    "personalizationReason": "Tailored based on slow existing site notes",
    "confidenceScore": 0.92,
    "followUpEmail": "...",
    "status": "PENDING_APPROVAL"
  }
  ```

### `POST /ai/generate-batch`
Batches draft generation across all eligible leads with consent.

---

## 5. Message Approval Queue

### `GET /messages`
Retrieves generated messages with status filter (`PENDING_APPROVAL`, `APPROVED`, `SENT`, `REJECTED`).

### `POST /messages/:id/approve`
Approves a message for dispatch. Allows optional modifications to subject or body.
Creates a queued `SendJob` with unique idempotency key.

### `POST /messages/bulk-approve`
Approves an array of message IDs.

### `POST /messages/:id/reject`
Rejects draft with audit reason.

### `POST /messages/:id/send`
Dispatches approved message immediately through centralized compliance engine.

---

## 6. Campaigns

### `GET /campaigns`
Lists all campaigns with recipient counts and performance.

### `POST /campaigns`
Creates a new outreach campaign.

### `POST /campaigns/:id/start`
Starts campaign execution.

### `POST /campaigns/:id/pause`
Pauses campaign execution.

---

## 7. Unified Inbox

### `GET /inbox`
Lists active client conversations grouped by Gmail thread ID or WhatsApp phone.

### `GET /inbox/:conversationId`
Retrieves complete chronologically ordered message thread.

### `POST /inbox/:conversationId/reply`
Sends an authorized manual response to client.

### `PATCH /inbox/:conversationId/status`
Updates lead pipeline status (`NEW`, `CONTACTED`, `REPLIED`, `INTERESTED`, `MEETING_REQUESTED`, `NOT_INTERESTED`, `UNSUBSCRIBED`, `CLOSED`).

---

## 8. Analytics & Settings

### `GET /analytics/overview`
Returns real database metrics: total leads, eligible consent count, sent emails/WhatsApp, replies, funnel timeline for Recharts.

### `GET /settings`
Returns automation safety settings (`DRY_RUN`, `DAILY_EMAIL_LIMIT`, `WHATSAPP_SEND_ENABLED`, etc.).

### `PATCH /settings`
Updates system settings.

### `POST /settings/emergency-stop`
Immediately engages `DRY_RUN=true`, sets `AUTO_SEND=false`, `WHATSAPP_SEND_ENABLED=false`, and pauses all active campaigns.
