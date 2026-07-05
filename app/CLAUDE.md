# Olim Navigator — project rules (v0.1)

Lean MVP. Source of truth: `../06-spec.md`. Change behavior there first, then here.

## Non-negotiables (Constitution)
- **Zero-Server Privacy.** No personal data, quiz profile, or uploaded images ever hit a server-side DB. Profile lives in `localStorage`; letter images are processed in-request and discarded. If a change would persist user data server-side, stop.
- **Gemini-first cost efficiency.** Gemini Flash is default. Claude (Haiku) only for images, long, or legal/complex text — see `needsClaude()` in `app/api/chat/route.ts`.
- **Cost caps are first-class.** Client counter (FR-C1, `page.tsx`), server per-id hard cap + global spend circuit breaker (FR-C2/C3, `route.ts`). Don't remove them to "simplify."

## Stack (lighter than pipeline default — on purpose)
Next.js 15 + Tailwind. No Supabase, no auth, no payments, no DB in v0.1.

## Agentic team flow
Every meaningful change should be run through the relevant project personas, with the Product Manager acting as orchestrator.

- **Product Manager / orchestrator:** defines the goal, assigns specialist passes, resolves tradeoffs, protects lean v0.1 scope, and turns findings into an ordered implementation plan.
- **QA:** verifies quiz, conditional questions, profile restore, chat, letter upload, caps, graceful failures, browser console health, and EN/RU/FR basics.
- **Senior Engineer / owner in the ponytail flow:** keeps the code small, maintainable, privacy-safe, cost-aware, and consistent with existing patterns. Treat `ponytail:` notes as important caveats.
- **UI/UX Designer:** owns clarity, trust, responsiveness, accessibility, and multilingual layout polish.
- **Experience Engineer:** makes sure personalization, action items, deadlines, office/form names, documents, pitfalls, and LLM answers are actually useful to a real oleh.
- **DevOps / launch owner:** owns production readiness, multi-user safety, KV-backed caps, env vars, API key health, quota behavior, monitoring, and rollback.

Default agentic flow: PM frames the user problem and success criteria → specialist personas give short findings/recommendations → PM synthesizes must-do/should-do/later → Senior Engineer implements the selected slice → QA verifies → UI/UX and Experience re-check the user-facing result → DevOps signs off for production-impacting changes.

Use this as a practical working loop, not bureaucracy: name the persona lens when it helps make a better decision.

## Grounding
Chat/letter answers are grounded in `app/grounding/*.md` (the Olim Chadashim Starter bundle, MIT). `lib/grounding.ts` keyword-routes each query to ONE skill doc and injects it. Never let the model answer Israeli-bureaucracy specifics (form numbers, sums, deadlines) that aren't in the grounding — the system prompt enforces this; keep it.

`route.ts`'s `systemPrompt()` also carries an answering protocol (direct answer → deadline → office/form → documents → pitfall → personalize from profile) and always includes the quiz profile as context, not just during the discovery call. This structure was adapted from a sibling app's export — its *prose pattern* only, never its specific numbers (those weren't independently verifiable and could be stale/hallucinated).

## Provider failure behavior
Provider/network/quota failures must degrade into useful user guidance, not broken UI and not saved outage text. In discovery mode, `route.ts` returns deterministic profile-aware fallback discoveries when the model is degraded. Preserve that behavior: never persist raw provider errors, quota messages, stack traces, or outage text as the user's personalized discoveries.

## Deterministic deadline layer
`lib/timeline.ts` computes known olim milestone dates (Bituach Leumi @90d, license conversion @12mo, Ulpan @18mo, customs/housing @36mo) via plain `Date` math from the quiz's aliyah date — zero LLM call, so it's free, instant, and can't hallucinate a date. Deliberately has NO hardcoded NIS amounts; money figures stay sourced from the grounded chat, not baked into shipped JS. Rendered in `page.tsx` as the "Your key deadlines" card with urgency-colored chips (red = overdue, orange <30d, amber <90d, gray beyond).

## Known ceilings (ponytail:)
- Server rate-limit is an **in-memory Map** — resets per serverless instance. Swap for Upstash Redis before real traffic (only file to touch: `route.ts` cost-cap block).
- Grounding is flat keyword match, no embeddings. Fine for 7 skills; revisit only if routing misses.
- RU/FR answers are translated by the LLM from EN/HE source docs — QA the translation quality.
- Next is pinned at `^15.5.20` with an npm override forcing Next's nested `postcss` to `8.5.10`; this cleared `npm audit --omit=dev` on 2026-07-05. Re-check audit after dependency changes.

## Run
`cp .env.example .env.local` (app runs without keys — returns visible stubs), `npm i`, `npm run dev`.
