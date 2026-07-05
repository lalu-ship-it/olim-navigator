# Olim Navigator Context Map

Last onboarded: 2026-07-05

## Project Identity

Olim Navigator is a lean v0.1 web app for new immigrants to Israel who need help understanding Israeli bureaucracy in English, Russian, or French.

Core promise: surface likely missed benefits/processes, answer bureaucracy questions from grounded source material, and explain Hebrew letters in plain language.

Active source of truth: `06-spec.md`. The older `06-spec-v1-full.md` is a v1+ roadmap only.

## Product Boundaries

Non-negotiables:
- Zero-server privacy: no user profile, credentials, uploaded letters, or personal documents persisted server-side.
- No auth, payments, Supabase, central database, WhatsApp, Telegram, form filling, or office finder in v0.1.
- Cost caps are first-class: local client counter, server hard cap, and global circuit breaker must stay in place.
- Gemini Flash is the default model path; Claude is only an escalation for long or legal/complex text.
- Israeli bureaucracy specifics must come from `app/grounding/*.md`; the model should say when grounding does not cover something.

30-day validation metrics from spec:
- 100+ people try the app.
- 20+ return for a second session.
- Learn what people ask about and where they drop off before choosing v1 monetization/features.

## Agentic Operating Model

Use these personas as an agentic working group for future product, design, implementation, QA, and launch decisions. The Project Manager is the orchestrator: they decompose the goal, assign specialist agents, collect findings, resolve tradeoffs, and turn the result into a clear next action. A change is not "done" until the relevant personas would sign off.

### Product Manager

Owns orchestration, scope, sequencing, and validation.
- Orchestrates the agentic flow: define goal, assign persona work, synthesize recommendations, choose the next step, and track done/not-done.
- Keeps v0.1 tight around quiz, grounded chat, and Hebrew-letter explanation.
- Protects the "I don't know what I don't know" value prop.
- Decides whether a change belongs in v0.1, v1, or the parking lot.
- Makes sure success metrics and learning goals are explicit.
- Avoids adding accounts, payments, or complex integrations before usage data justifies them.
- Produces the final task brief for implementation: problem, user, expected outcome, acceptance criteria, owner personas, and verification plan.

### QA

Owns correctness, regression safety, and acceptance criteria.
- Verifies quiz flow, conditional questions, localStorage restore, chat, letter upload, caps, and graceful error states.
- Checks EN/RU/FR UI basics and obvious rendering issues.
- Exercises mobile and desktop layouts.
- Confirms no browser console errors and no broken API responses.
- Pushes for small automated tests around deterministic logic and input limits.

### Senior Engineer / Owner In The Ponytail Flow

Owns architecture, maintainability, and project constraints.
- Works in the existing lightweight Next.js + Tailwind flow.
- Keeps changes small, practical, and consistent with `06-spec.md` and `app/CLAUDE.md`.
- Preserves zero-server privacy and cost caps.
- Treats "ponytail" notes as important implementation caveats, not decorative comments.
- Resists premature abstractions, but extracts components/helpers when `page.tsx` becomes hard to safely change.

### UI/UX Designer

Owns visual clarity, interaction design, and accessibility polish.
- Makes the first screen immediately useful, not marketing-heavy.
- Keeps the product calm, trustworthy, and easy to scan.
- Ensures controls are discoverable, labels fit, mobile works, and tap targets are comfortable.
- Improves multilingual layout resilience for longer Russian/French strings.
- Uses visual hierarchy to make next actions obvious without over-explaining the app.

### Experience Engineer

Owns usefulness of the actual user experience.
- Ensures personalization feels real: answers and discoveries should use aliyah date, city, family, children, country, and employment when relevant.
- Makes action items easy to do: plain steps, office/site names, needed documents, deadlines, and common pitfalls.
- Reviews LLM outputs for usefulness, grounding, tone, and language quality.
- Pushes the UI from "chat that answers" toward "assistant that helps me finish the next step."
- Spots moments where deterministic UI should replace or supplement the LLM to reduce hallucination and cost.

### DevOps / Launch Owner

Owns getting from local MVP to safe multi-user launch.
- Replaces in-memory rate limits with Upstash/Vercel KV before public traffic.
- Confirms env vars, deployment target, daily spend cap, logging, and rollback path.
- Checks that no personal data is persisted server-side in logs, KV, analytics, or errors.
- Makes sure multiple users can use the app without one serverless instance becoming the hidden source of truth.
- Defines launch checklist: build, smoke test, caps, API key health, quota behavior, and monitoring.

## Agentic Flow

For meaningful upgrades, run this flow:

1. PM frames the goal: what user problem are we improving, why now, and what does success look like?
2. PM assigns specialist passes:
   - Product Manager: scope, priority, acceptance criteria.
   - Experience Engineer: usefulness, personalization, answer/action quality.
   - UI/UX Designer: interaction model, hierarchy, mobile, accessibility.
   - Senior Engineer: architecture, implementation plan, risks.
   - QA: test matrix, regressions, edge cases.
   - DevOps: production and multi-user implications.
3. Specialists produce short findings with severity and recommended action.
4. PM synthesizes into one ordered plan: must-do, should-do, later.
5. Senior Engineer implements the selected slice.
6. QA verifies the slice; UI/UX and Experience re-check user-facing quality.
7. DevOps signs off if the change affects deployment, cost, keys, rate limits, logging, or multi-user behavior.
8. PM updates `CONTEXT.md`, `app/CLAUDE.md`, or `06-spec.md` when the product/architecture memory changes.

## Review Gates

Before shipping a meaningful change, run the relevant gates:
- Product: Does this preserve the lean v0.1 promise and teach us something useful?
- QA: Can the happy path, edge states, and regressions be verified?
- Senior Engineer: Does this fit the architecture without weakening privacy/cost controls?
- UI/UX: Is it clear, responsive, accessible enough, and visually consistent?
- Experience: Will a real oleh know what to do next after seeing this?
- DevOps: Will this survive multiple users and a production deployment?

## Current Implementation

The MVP is already scaffolded and implemented under `app/`.

Runtime:
- Next.js 15.1.6
- React 19
- TypeScript 5.7
- Tailwind 3.4
- `react-markdown` for model output rendering

Run:
- `cd app`
- `npm install`
- `npm run dev`
- App runs without API keys and returns visible stub responses.

Environment:
- `app/.env.example` documents `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `DAILY_MSG_CAP`, `NEXT_PUBLIC_DAILY_MSG_CAP`, and `GLOBAL_DAILY_SPEND_USD`.
- Keep `DAILY_MSG_CAP` and `NEXT_PUBLIC_DAILY_MSG_CAP` equal.

## File Map

Top-level docs:
- `README.md`: pipeline status and recommended next skill progression.
- `01-one-pager.md`: original product framing and monetization hypothesis.
- `06-spec.md`: active v0.1 lean spec.
- `06-spec-v1-full.md`: deferred v1+ roadmap.
- `_model-routing.md`: recommended model per ai-app-pipeline skill.
- `CONTEXT.md`: this project memory/context map.

App files:
- `app/README.md`: app run instructions and file overview.
- `app/CLAUDE.md`: project rules for future assistant passes; read before modifying behavior.
- `app/app/page.tsx`: entire client UI: quiz, discoveries, deadline card, chat, letter upload, localStorage profile, client-side daily cap.
- `app/app/api/chat/route.ts`: single API route for discovery, chat, and letter explanation; cost caps, cookie rate-limit id, grounding injection, model routing, Gemini/Claude calls, stubs.
- `app/lib/quiz.ts`: quiz schema, conditional questions, and discovery prompt builder.
- `app/lib/timeline.ts`: deterministic deadline/milestone computation from aliyah date.
- `app/lib/grounding.ts`: keyword router from user query to one grounding markdown file.
- `app/lib/i18n.ts`: static UI strings for English/Russian/French.
- `app/app/globals.css`: Tailwind base plus custom colors, soft card styling, and animations.
- `app/grounding/*.md`: local source docs for aliyah, Bituach Leumi, HMO, bank, apartment, vehicle, and customs/shipment topics.

## Main User Flow

1. User lands on `/`.
2. Quiz asks aliyah date, city, country of origin, family status, conditional spouse/children questions, and work status.
3. Answers are stored in `localStorage` as `olim_profile`.
4. Discovery call posts to `/api/chat` with `mode: "discover"`.
5. Chat mode shows:
   - Personalized discoveries if generated.
   - Deterministic deadline card from `computeDeadlines`.
   - Chat thread and composer.
   - Image upload button for Hebrew letters.
6. Uploaded images are base64 encoded client-side and sent in-request only; the server does not store them.

## API Behavior

Route: `app/app/api/chat/route.ts`

POST body shape:
- `text`: user text, or `"quiz-discoveries"` for discovery.
- `lang`: `en`, `ru`, or `fr`.
- `quiz`: profile answers.
- `mode`: optional `"discover"`.
- `image`: optional `{ data, mime }` base64 image payload.

Important details:
- Server runtime is `nodejs` because `lib/grounding.ts` reads markdown from disk.
- Cookie `olim_id` is a random rate-limit handle, not a profile identifier.
- Message cap defaults to 30/day.
- Global spend cap defaults to 15 USD/day.
- Cost estimate is hardcoded as `0.01` per message.
- Text max is 4000 chars.
- Image max is approximately 10MB original / 14MB base64.
- Missing API keys return stub answers so the UI remains testable.
- Provider/network/quota failures return localized retry guidance. In discovery mode, degraded model results are replaced with deterministic profile-aware fallback discoveries instead of being persisted as if they were model output.

## Grounding Model

The grounding router selects exactly one markdown source by keyword score:
- Default: `israeli-aliyah-navigator`
- Bituach Leumi
- HMO
- Apartment hunting
- Vehicle manager
- Bank connector
- Customs/shipment planner

Known limitation: routing is flat keyword matching, not embeddings. Keep keywords specific; generic words like "oleh", "aliyah", "benefit", and "form" can create bad ties.

## Privacy And Storage

Client-side localStorage keys:
- `olim_profile`: quiz answers and discoveries.
- `olim_count`: client-side daily message count.
- `olim_tasks_done`: local completion state for deadline tasks.

Server-side memory:
- `perUser` Map for daily cap.
- `globalSpend` object for global circuit breaker.

No server database exists. Do not add one for user data in v0.1.

## Known Risks / Ceilings

- The server rate-limit is an in-memory Map. This leaks across multiple Vercel/serverless instances and resets on process restart. Before real traffic, swap this block to Upstash/Vercel KV while preserving the same privacy boundary.
- Some deadline links in `timeline.ts` are search links or not independently fetch-confirmed because gov.il can block automated checks.
- Deadline UI labels are currently English-only.
- The whole UI lives in one large `page.tsx`; acceptable for MVP, but future additions may need component extraction.
- There is no `/api/letter`; letter explanation is folded into `/api/chat`.
- There are no automated tests yet.
- No Git repository is initialized at the project root as of this onboarding.

## Latest Verification

2026-07-05:
- `npm run build` passed.
- `npm run dev` required elevated local-server permission and started on `http://localhost:3001` because port 3000 was already in use.
- Browser QA completed the quiz happy path with a family profile: date, city, country, family status, spouse, children ages, children born in Israel, and employment.
- Chat mode rendered successfully with discoveries section, deterministic deadlines, composer, and camera upload button.
- Deadline card rendered expected milestone rows and urgency chips.
- Sending a chat question produced a visible assistant response and no browser console errors.
- `.env.local` has `GEMINI_API_KEY` set and `ANTHROPIC_API_KEY` empty/missing. Current model responses show Gemini's rate-limit/quota fallback text ("We're getting a lot of questions right now...") rather than local stubs.

2026-07-05 agentic upgrade pass:
- PM orchestrated sidecar specialist audits from Experience Engineer, DevOps/Launch, and UI/QA.
- Implemented model failure handling in `app/app/api/chat/route.ts`: Gemini/Claude/network/provider failures now produce localized degraded responses; discovery failures produce deterministic profile-aware fallback discoveries.
- Verified the discovery degraded path against the running local API. A family profile in Tel Aviv now receives useful fallback bullets instead of saved quota text.
- Upgraded Next.js from `15.1.6` to `15.5.20`.
- Added a targeted npm override for Next's nested PostCSS dependency to `8.5.10`.
- `npm run build` passes on Next `15.5.20`.
- `npm audit --omit=dev --json` reports 0 vulnerabilities.
- DevOps P0 framework-security blocker is cleared; production-safe KV caps remain a launch blocker.

## PM Synthesis

Completed in this pass:
- P1 Experience: model quota/provider failure no longer poisons saved discoveries.
- P0 DevOps: critical/high Next.js advisories cleared with a semver-minor upgrade and scoped PostCSS override.

Must-do before public launch:
- Replace in-memory `perUser` and `globalSpend` counters with Upstash/Vercel KV atomic counters and TTLs.
- Add a privacy notice explaining local profile storage plus in-request processing by model providers.
- Add metadata-only observability for cap hits, provider status, model route, grounding skill, latency, and error class. Never log prompt text, profile details, or images.
- Configure production env vars and provider dashboard quotas.
- Initialize Git and create a tagged launch baseline/rollback anchor.

Tester launch path:
- Use Vercel with root directory `app`.
- Set `GEMINI_API_KEY`, `DAILY_MSG_CAP`, `NEXT_PUBLIC_DAILY_MSG_CAP`, and `GLOBAL_DAILY_SPEND_USD`.
- `ANTHROPIC_API_KEY` is optional for beta; without it, Claude escalation falls back to Gemini.
- KV can be skipped for 5-10 trusted testers if provider dashboard usage is watched manually.
- See `DEPLOY.md` for the runbook.

Next product-quality slice:
- Build deterministic personalized action cards after onboarding: 3-5 prioritized actions with profile reason, urgency/due date, first step, office/site, documents, pitfall, and link/source.
- Let the LLM phrase or expand actions when available, but keep deterministic cards useful when models are degraded.
- Localize deadline/action UI for RU/FR.

## Next Useful Moves

Highest-value next steps:
- Replace in-memory caps with Upstash/Vercel KV before any public launch.
- Add personalized action cards backed by deterministic profile/timeline logic.
- Add a small test or smoke-check layer for `computeDeadlines`, `groundFor`, input limits, and provider-degraded discovery fallback.
- Run full browser QA after action-card changes: quiz, chat, cap, upload, EN/RU/FR, mobile.
- Localize the deterministic deadline card labels.
- Improve responsive/mobile polish and accessibility around icon-only controls.
- QA real Gemini/Claude responses against the grounding docs, especially RU/FR translations.

Before changing behavior:
- Update `06-spec.md` first if the behavior affects product scope.
- Then update `app/CLAUDE.md` and this `CONTEXT.md` if the rule/architecture changes.
