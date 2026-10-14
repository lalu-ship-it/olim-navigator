# Olim Navigator Master Handoff

Last updated: 2026-10-14  
Project status: live tester beta  
Primary owner context: built and launched from this local workspace with GitHub/Vercel deployment.

## 1. Project Locations

Local workspace:

```txt
/Users/hillaashkenazi/Downloads/ai-app-pipeline/ideas/idea-01-olim-navigator
```

Next.js app root:

```txt
/Users/hillaashkenazi/Downloads/ai-app-pipeline/ideas/idea-01-olim-navigator/app
```

GitHub repo:

```txt
https://github.com/lalu-ship-it/olim-navigator
```

Live production app:

```txt
https://olim-navigator.vercel.app
```

Vercel project:

```txt
lalu-ship-its-projects / olim-navigator
```

Important note: older docs such as `README.md`, `CONTEXT.md`, and `DEPLOY.md` still contain some launch-era notes. This file is the current master handoff.

## 2. Product Summary

Olim Navigator is a lean v0.1 web app for new immigrants to Israel. It helps users understand Israeli bureaucracy in English, Russian, or French.

Core user promise:

- Ask a short onboarding quiz.
- Surface likely missed benefits/processes.
- Answer bureaucracy questions using local grounded source material.
- Explain Hebrew letters/photos in plain language.
- Keep the tester beta privacy-first: no account, no server database, no server-side profile storage.

Current tester-facing features:

- Quiz with conditional family/spouse/children questions.
- Instant deterministic post-quiz checklist.
- Background AI refinement of the checklist.
- Deterministic deadline/task card from aliyah date.
- Grounded chat.
- Hebrew-letter image upload through the chat route.
- EN/RU/FR static UI strings.
- Feedback buttons under bot answers: helpful / not helpful / too slow.
- Visible guide/source label under bot answers, e.g. `Grounded in: Aliyah Navigator`.

## 3. Current Stack

App:

- Next.js `^15.5.20`
- React `19.0.0`
- TypeScript `5.7.3`
- Tailwind CSS `3.4.17`
- `react-markdown`

Hosting:

- Vercel
- Root directory configured as `app`
- Framework preset: Next.js
- Production branch: `main`

Models:

- Default Gemini model: `gemini-3.1-flash-lite`
- Claude escalation path exists in code, but Anthropic can be unset; failures fall back to Gemini.
- Older `gemini-flash-latest` was replaced because production discovery calls were slow.
- `gemini-2.5-flash-lite` was tested directly and returned 404 / no longer available to new users, so it was not used.

## 4. Environment Variables

Configured locally:

- `app/.env.local` contains `GEMINI_API_KEY`.
- `ANTHROPIC_API_KEY` was absent/empty locally during launch.

Configured in Vercel:

- `GEMINI_API_KEY`

Recommended / supported:

```txt
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...              optional
DAILY_MSG_CAP=30
NEXT_PUBLIC_DAILY_MSG_CAP=30
GLOBAL_DAILY_SPEND_USD=15
GEMINI_MODEL=gemini-3.1-flash-lite optional override
MODEL_TIMEOUT_MS=10000             optional override
CHAT_OUTPUT_TOKENS=900             optional override
DISCOVERY_OUTPUT_TOKENS=650        optional override
```

Important: keep `DAILY_MSG_CAP` and `NEXT_PUBLIC_DAILY_MSG_CAP` equal if you set them.

## 5. Key Files

Top-level:

- `MASTER_HANDOFF.md`: this file, current source of truth.
- `README.md`: original pipeline status, now partly stale.
- `CONTEXT.md`: project memory/context map, useful but partly stale.
- `DEPLOY.md`: tester launch runbook.
- `06-spec.md`: active lean v0.1 product spec.
- `06-spec-v1-full.md`: v1+ roadmap, not current build source.

App:

- `app/app/page.tsx`: main UI, quiz, chat, feedback UI, localStorage, upload.
- `app/app/api/chat/route.ts`: main AI route, caps, grounding, model calls, timeout, logs.
- `app/app/api/feedback/route.ts`: privacy-light feedback endpoint.
- `app/lib/grounding.ts`: keyword router over grounding docs.
- `app/lib/discoveries.ts`: instant deterministic onboarding checklist and fallback discoveries.
- `app/lib/quiz.ts`: quiz schema and discovery prompt.
- `app/lib/timeline.ts`: deterministic deadline/task computation.
- `app/lib/i18n.ts`: EN/RU/FR UI copy.
- `app/grounding/*.md`: local grounded knowledge files.

Current grounding files:

- `israeli-aliyah-navigator.md`
- `israeli-bituach-leumi.md`
- `israeli-hmo-navigator.md`
- `israeli-apartment-hunting.md`
- `israeli-vehicle-manager.md`
- `israeli-bank-connector.md`
- `israeli-aliyah-customs-shipment-planner.md`

## 6. Main User Flow

1. User opens `https://olim-navigator.vercel.app`.
2. User completes the quiz:
   - aliyah date
   - city
   - country of origin
   - family status
   - spouse oleh status when relevant
   - children ages / born in Israel when relevant
   - employment status
3. Profile is saved only in browser `localStorage`.
4. App immediately enters chat mode with deterministic discoveries from `app/lib/discoveries.ts`.
5. In the background, the app calls `/api/chat` with `mode: "discover"` and replaces discoveries if AI returns a better result.
6. Deadline card is computed locally from `app/lib/timeline.ts`.
7. User asks questions through chat.
8. Server chooses one grounding guide via `app/lib/grounding.ts`, builds a constrained prompt, and calls Gemini.
9. Bot answer renders with Markdown, a source-guide label, and feedback buttons.
10. Optional image upload sends a base64 image in the request only; the server does not store it.

## 7. Privacy And Storage

Client-side `localStorage`:

- `olim_profile`: quiz answers and discoveries.
- `olim_count`: client-side daily question count.
- `olim_tasks_done`: local done/not-done state for deadline tasks.

Server-side:

- `olim_id` cookie: random rate-limit handle, not a profile identifier.
- `perUser` in-memory Map: daily per-user cap.
- `globalSpend` in-memory object: rough global spend circuit breaker.
- `/api/feedback` logs only metadata: rating, answerId, guide/skill, language, timestamp.

Not stored server-side:

- user profile
- chat text in the feedback endpoint
- answer text in the feedback endpoint
- uploaded images
- uploaded document data

Important risk: Vercel function logs still include our explicit `console.info` / `console.warn` metadata. Keep them metadata-only.

## 8. Cost / Rate Limit State

Current beta guardrails:

- Client daily cap defaults to 30.
- Server per-user daily cap defaults to 30.
- Global spend estimate defaults to 15 USD/day.
- Text max: 4000 characters.
- Image max: roughly 10MB original / 14MB base64.
- Model timeout: 10 seconds.
- Output caps:
  - chat: 900 tokens
  - discovery: 650 tokens

Important limitation:

- Caps are in memory. On Vercel/serverless, multiple instances can each have their own Map/object. This is acceptable only for trusted tester beta.
- Before broad launch, replace `perUser` and `globalSpend` with Upstash/Vercel KV or another shared store.

## 9. Deployment History And Commits

Main commits created during the launch session:

```txt
a53dbdd Launch tester beta
3cbffbc Speed up AI responses
3b11da4 Make quiz results instant
7cb2fb4 Add answer feedback loop
```

Launch actions completed:

- Initialized Git repo.
- Configured local git user:
  - `lalu-ship-it`
  - `lalu-ship-it@users.noreply.github.com`
- Created/pushed GitHub repo:
  - `https://github.com/lalu-ship-it/olim-navigator`
- Added local SSH key to GitHub as:
  - `Hillas MacBook Air Codex deploy`
- Imported GitHub repo to Vercel.
- Set Vercel root directory to `app`.
- Added `GEMINI_API_KEY` in Vercel.
- Redeployed after env var was added.

Current live URL:

```txt
https://olim-navigator.vercel.app
```

## 10. Verification Performed

Build and security:

- `npm run build` passed multiple times.
- `npm audit --omit=dev --json` previously reported 0 vulnerabilities.

Initial production smoke:

- Before Vercel env var was added, `/api/chat` returned stub text.
- After adding `GEMINI_API_KEY` and redeploying, `/api/chat` returned real personalized answers.

Latency work:

- Original production discovery smoke was about 20-22 seconds.
- Switched from `gemini-flash-latest` to a fixed model.
- Tested `gemini-2.5-flash-lite`; API returned 404 / no longer available to new users.
- Verified `gemini-3.1-flash-lite` with a direct generate call.
- Added timeout, output caps, compacted grounding, and fast discovery grounding.
- Local discovery: about 7.1 seconds with real model.
- Local normal Arnona chat: about 3.8 seconds.
- Production normal chat after optimization: about 3.5-5.7 seconds in smoke tests.

Instant UX work:

- Quiz now transitions immediately to chat with deterministic discoveries.
- AI discovery refreshes in the background.

Feedback work:

- Local `/api/feedback` smoke returned `200`.
- Production `/api/feedback` initially returned `404` while Vercel deployment had not propagated.
- After waiting, production `/api/feedback` returned `200`.

Known production smoke commands used conceptually:

```bash
node -e "const t=Date.now(); fetch('https://olim-navigator.vercel.app/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lang:'en',text:'How do I apply for arnona discount in Tel Aviv?',quiz:{aliyahDate:'2025-01-15',city:'Tel Aviv',family:'family',childrenAges:'3, 8',employment:'job-seeking'}})}).then(r=>r.text().then(x=>{console.log('status',r.status); console.log('ms',Date.now()-t); console.log(x.slice(0,1000));}))"
```

```bash
node -e "fetch('https://olim-navigator.vercel.app/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({answerId:'production-smoke',rating:'helpful',skill:'israeli-aliyah-navigator',lang:'en'})}).then(r=>r.text().then(t=>{console.log('status',r.status); console.log(t.slice(0,300));}))"
```

## 11. Decisions Made

Privacy:

- Keep v0.1 profile local-only.
- Do not add accounts/database yet.
- Do not store uploaded letter images.

Launch:

- Vercel + GitHub for tester beta.
- Public repo has no `.env.local`, `.next`, `node_modules`, or `.claude`.

Cost:

- Skip KV for trusted beta.
- Use in-memory caps temporarily.
- Add KV before wider launch.

AI:

- Use Gemini as primary.
- Keep Claude optional and non-blocking.
- Use strict grounding: if grounding does not cover a question, the model should say so rather than invent specifics.

UX:

- Avoid dead waiting after quiz.
- Show deterministic useful content immediately.
- Add answer feedback to learn from testers.

## 12. Important Failure / Product Lesson

Observed user query:

```txt
my wife and i got married in the states how can we get into מחיר למשתכן
```

Observed app answer:

- Said the provided material does not contain information about `Mechir LaMishtaken`.
- Suggested Ministry of Construction and Housing.
- Displayed `Grounded in: Aliyah Navigator`.

What went wrong:

- This was not just a missing keyword.
- The app behaves like isolated topic guides.
- Real users ask life-event questions that cross domains.

This query crosses:

- US/foreign marriage recognition.
- Israeli marital status update with Misrad HaPnim.
- Apostille / translation / document preparation.
- Subsidized housing eligibility.
- `Mechir LaMishtaken` / `Dira BeHanacha`.
- `chasrei dira` / no-homeownership eligibility.
- Lottery registration and eligibility certificate workflow.

The answer was safe, but shallow. It did not hallucinate, which is good, but it failed to help.

Deeper diagnosis:

- The app needs life-event workflow reasoning, not only topic routing.
- The router currently picks one guide, while many real questions require multiple guides plus a workflow layer.
- The `Grounded in` label successfully exposed the mismatch.

Better target answer shape for this class:

1. State the likely path.
2. Confirm assumptions.
3. Identify blockers.
4. Name exact offices.
5. List documents.
6. Give sequence of steps.
7. Name official programs and Hebrew terms.
8. Ask one or two missing questions only when needed.

Example target behavior:

```txt
You may be able to apply, but first make sure Israel recognizes you as married. If your US marriage is not updated in Misrad HaPnim, the housing eligibility system may not treat you as a married couple. Start by registering the foreign marriage with an apostilled marriage certificate and any required translation, then request an eligibility certificate for Dira BeHanacha / Mechir LaMishtaken through the Ministry of Construction and Housing process, then enter lotteries.
```

## 13. Known Gaps

Critical before broader launch:

- Replace in-memory caps with KV.
- Add privacy notice.
- Add provider hard budgets/quotas outside the app.
- Add better observability dashboard or structured log review.

Product quality:

- Add life-event workflow layer.
- Add multi-source routing.
- Add subsidized housing grounding and workflow.
- Add foreign marriage registration workflow.
- Add source-linked official references inside answers.
- Add “reset profile” and “export checklist.”
- Improve answer-to-action task cards.

Technical:

- `app/app/page.tsx` is large and should be split once more features are added.
- No automated tests yet.
- Feedback currently logs to Vercel logs only; no dashboard or persistent analytics store.
- Grounding compaction is simple text matching, not semantic retrieval.
- `/api/chat` still handles discovery, chat, and letter explanation together.

Content gaps:

- Subsidized housing / `מחיר למשתכן` / `דירה בהנחה`.
- Foreign civil marriage registration in Israel.
- Ministry of Interior life events.
- Mortgage / oleh mortgage support.
- End-to-end “married couple wants first home” flow.

## 14. Recommended Next Build

The next meaningful build should not be “add one more FAQ page.” It should introduce a workflow layer.

Suggested implementation slice:

1. Add `app/grounding/israeli-subsidized-housing.md`.
2. Add `app/grounding/israeli-marriage-registration.md`.
3. Add a lightweight workflow router that can return multiple guides, not one.
4. Add a `life-event` answer mode for cross-domain questions.
5. Add test fixtures for:
   - `my wife and i got married in the states how can we get into מחיר למשתכן`
   - `we married abroad how do I update status in Israel`
   - `can new olim apply for דירה בהנחה`
   - `what documents do I need for marriage recognition`
6. Update UI source label to support multiple sources:
   - `Grounded in: Marriage Registration + Subsidized Housing`

Acceptance criteria:

- The exact Mechir LaMishtaken query no longer falls back to Aliyah Navigator only.
- The answer explains sequence, not just facts.
- The answer clearly says what depends on eligibility and what must be verified officially.
- The answer does not invent numbers/deadlines.
- The guide label shows the relevant workflow/grounding sources.

## 15. Current Agentic Personas

Use these for future planning/review:

- Product Manager: orchestrates scope, priorities, acceptance criteria.
- QA: verifies flows, regressions, multilingual basics, caps, console/API health.
- Senior Engineer / owner in the ponytail flow: keeps architecture small, privacy/cost-safe, and maintainable.
- UI/UX Designer: owns clarity, mobile, interaction, accessible controls.
- Experience Engineer: makes answers useful, personalized, action-oriented, and grounded.
- DevOps / Launch Owner: owns Vercel, env vars, multi-user readiness, KV, budgets, monitoring, rollback.

For meaningful upgrades, run:

1. PM frames the user problem and success criteria.
2. Experience Engineer defines what a truly useful answer/action looks like.
3. Senior Engineer designs the smallest safe implementation.
4. UI/UX checks interaction and labels.
5. QA defines exact fixtures and regressions.
6. DevOps checks production/cost/privacy implications.
7. Implement, build, smoke test, push.

## 16. Commands

Install:

```bash
cd app
npm install
```

Run dev:

```bash
cd app
npm run dev -- --port 3002
```

Build:

```bash
cd app
npm run build
```

Audit:

```bash
cd app
npm audit --omit=dev
```

Check git:

```bash
git status --short
git log --oneline -8
```

Push:

```bash
git push
```

## 17. Tester Note To Share

Suggested tester wording:

```txt
This is an early beta for Olim bureaucracy help:
https://olim-navigator.vercel.app

Please try the quiz and ask real bureaucracy questions. Use the feedback buttons under answers. Do not upload highly sensitive documents yet. The app does not create an account or store your profile on our server, but questions and uploaded letter images are processed by an AI provider during the request.
```

