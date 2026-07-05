# Spec v0.1 (Lean): Olim Bureaucracy Navigator

> ACTIVE SPEC for skill 08 (scaffold-mvp) and skill 09 (implement-feature). `06-spec-v1-full.md` in this folder is the original full-featured spec — kept as the v1+ roadmap once v0.1 is validated, not to be built from yet.

## Constitution (carried over from v1, unchanged)
- **Zero-Server Privacy:** No personal details, credentials, or uploaded files persist on a server. Profile lives in browser storage only.
- **Single Source of Truth:** This spec is the source of truth for v0.1. Changes to behavior get reflected here first.
- **Gemini-First Cost Efficiency:** Gemini Flash handles the large majority of chat/translation traffic. Claude is reserved for complex legal-document parsing or edge-case translation.

## What changed from v1 and why

| Cut from v1 | Why |
|---|---|
| Credits system, checkout, webhooks | Reintroduces exactly the complexity/cost-risk we're trying to avoid before we know what's worth paying for |
| WhatsApp/Telegram bot | Separate integration surface; validate the core first |
| Client-side PDF form-filling, split-screen preview | High build cost for a feature we haven't confirmed is the priority pain point |
| Office/location finder | Nice-to-have, not core to the "I don't know what I don't know" problem |
| Server-side database | Not needed yet — profile stays local, no accounts required to use the app |

## Overview

A conversational assistant, in the user's language (English, Russian, French), that:
1. Tells them what they're likely entitled to that they don't know about (the "מחיר למשתכן moment")
2. Answers anything about Israeli bureaucracy in plain language
3. Explains a photographed Hebrew letter and what to do about it

Powered by an LLM (Gemini Flash primary, Claude for complex cases) grounded in the AgentSkills Olim Chadashim bundle.

## Core Features (v0.1)

### F1 — Personalization Quiz
5 questions on first visit: aliyah date, city, family status, employment status, language. Output: a short personalized list of benefits/processes they may be missing, framed as discoveries not a checklist audit.

### F2 — Chat
Open-ended chat, grounded in the Olim Chadashim skill bundle + the user's quiz profile. Answers questions like "how do I renew my license" or "am I entitled to X" in the user's chosen language.

### F3 — Letter Translation
User uploads/photographs a Hebrew letter. System (ephemeral, not stored) extracts text, translates, and explains: what it's about, is action needed, roughly by when. No structured task/deadline database yet — this is conversational output, not a dashboard.

## Cost Control (first-class requirement, not an afterthought)

- **FR-C1:** Per-user/session soft cap — daily message counter kept client-side, reset every 24h.
- **FR-C2:** Server-side hard cap — a lightweight identifier (cookie-based random ID) tracked in a KV store (e.g. Vercel KV / Upstash Redis free tier) enforces a hard daily message ceiling per identifier (suggest: 30 msgs/day).
- **FR-C3:** Global circuit breaker — a running daily spend counter across all users. If it crosses a defined threshold (e.g. $15/day), the app shows a "come back tomorrow" message instead of silently continuing to spend.
- **FR-C4:** Model routing — Gemini Flash by default; escalate to Claude only for detected complex/legal edge cases (e.g. long documents, ambiguous translations).

No payments, no credits ledger, no webhook integration in v0.1.

## Functional Requirements

- **FR-1:** Multilingual UI (English, Russian, French).
- **FR-2:** Onboarding quiz (5 questions), result stored in browser storage (localStorage), never sent to a server database.
- **FR-3:** Conversational chat interface, grounded in the Olim Chadashim skill bundle.
- **FR-4:** Image upload for Hebrew letters (JPEG/PNG, reasonable size limit e.g. 10MB).
- **FR-5:** Ephemeral OCR/translation/explanation of uploaded letters — processed in-request, nothing persisted server-side.
- **FR-6:** Cost controls per FR-C1–FR-C4 above.
- **FR-7:** No login required to use the app in v0.1 (removes auth complexity entirely for validation phase).

## Architecture

```
Next.js app (single codebase)
├── /                      → onboarding quiz + chat UI
├── /api/chat              → one route: takes message + profile + language
│                             → checks cost caps (KV)
│                             → routes to Gemini Flash or Claude
│                             → grounds response in Olim Chadashim skill content
├── /api/letter             → same cost-cap logic
│                             → image → LLM directly (no separate OCR step needed initially)
└── Vercel KV (or Upstash)  → rate-limit + spend counters only, no user data
```

No database, no auth provider, no payment provider. Deployable to Vercel (or DropLive once available) as-is.

## Acceptance Criteria

- **AC-1:** User can complete the quiz and see a personalized list of likely-unknown entitlements within 30 seconds.
- **AC-2:** User can ask a free-form question and get an answer in their selected language, grounded in the skill bundle.
- **AC-3:** User can upload a photo of a Hebrew letter and get a plain-language explanation with any action items surfaced.
- **AC-4:** A user hitting the daily message cap sees a clear, friendly message — not an error.
- **AC-5:** If the global daily spend threshold is hit, the app degrades gracefully with a "come back tomorrow" message, not a broken UI.
- **AC-6:** No personal data (profile, uploaded images) is ever written to a server-side database.
- **AC-7:** Closing and reopening the browser retains the user's profile and quiz results (localStorage).

## Success Metrics (30 days) — revised

- 100+ people try the app
- 20+ return for a second session
- Track: what do people actually ask about most? Where do they get stuck or drop off?
- This data — not a spec guess — decides what v1 (payments, forms, WhatsApp) should prioritize.

## Explicitly Out of Scope for v0.1
- Payments, credits, checkout
- WhatsApp/Telegram integration
- Client-side PDF form generation
- Office/location finder
- User accounts / login
- Task dashboard with deadlines (chat handles this conversationally for now)

## Open Questions
- [ ] Confirm which KV/rate-limit provider to use (Vercel KV vs Upstash Redis) — both have workable free tiers.
- [ ] Confirm exact daily message cap and global spend threshold before launch.
- [ ] Decide whether Gemini Flash or Claude Haiku is the default router model based on live cost/quality testing with real Olim Chadashim bundle content.
