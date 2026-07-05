# idea-01-olim-navigator — status

Use this folder as-is with the `ai-app-pipeline` skills. Current state:

| # | Skill | Status |
|---|---|---|
| 01 | validate-idea | ✅ done → `01-one-pager.md` (validation write-up not separately captured, but the idea has real evidence: a couple met in-person who'd missed מחיר למשתכן for years) |
| 02 | research-market | Not run |
| 03 | frame-jtbd | Not run (informally: "I don't know what I don't know" — surfacing entitlements nobody told them about) |
| 04 | pick-monetization | **Deliberately skipped for v0.1.** Ships free with hard cost caps; monetization gets decided post-validation from real usage data, not guessed upfront. |
| 05 | write-spec | ✅ done → `06-spec.md` is the ACTIVE lean v0.1 spec. `06-spec-v1-full.md` is the original full-featured spec — treat as the v1+ roadmap, not something to build from yet. |
| 06 | design-ux-flow | Not run — do this next |
| 07 | plan-stack | Not formalized, but pre-decided: Next.js + Vercel only. No Supabase/auth/payments for v0.1 — lighter than `_config.md` defaults on purpose, since v0.1 has no accounts or database. |
| 08 | scaffold-mvp | Not started |
| 09 | implement-feature | Not started. Three features to loop: (1) onboarding quiz, (2) chat, (3) letter translation |
| 10-14 | qa/landing/launch/metrics/review | Not started |

`_model-routing.md` in this folder has the recommended model per skill (mostly Sonnet 5, Haiku 4.5 for mechanical stages, Opus 4.8 for the spec self-review).

## Recommended next command

Run skill 06 (design-ux-flow) against `06-spec.md`, then skill 07 (plan-stack) — making sure it stays lighter than `_config.md`'s default stack — then skill 08 to scaffold, then loop skill 09 three times.
