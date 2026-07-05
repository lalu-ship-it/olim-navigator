# Model Routing for ai-app-pipeline

Which Claude model to run **each pipeline skill** with. This is about which model builds the app (runs the skills in Claude Code / claude.ai) — separate from which model powers the app's own AI feature at runtime (that's decided in skill 04/07/08 as part of the product itself, e.g. Gemini Flash for the Olim Navigator's chat).

## The principle

Cost scales with volume × stakes. Skills 01-04 are cheap iteration you'll redo often — don't overpay. Skill 05 (spec) and the analyze/self-review passes are where mistakes get expensive to unwind later — pay for quality there. Skill 09 is the highest-volume stage (run once per feature) — default to the balanced model, escalate only when stuck.

## Allocation table

| # | Skill | Model | Why |
|---|---|---|---|
| 01 | validate-idea | **Sonnet 5** | Needs real research + adversarial scoring judgment. Cheap enough to re-run per idea without thinking twice. |
| 02 | research-market | **Sonnet 5** | Web research + synthesis, same tier as 01. |
| 03 | frame-jtbd | **Sonnet 5** | Needs to actually understand the user, not template-fill. |
| 04 | pick-monetization | **Sonnet 5** | Judgment call against `_config.md` defaults; not mechanical enough for Haiku. |
| 05 | write-spec | **Opus 4.8** | Highest-leverage document in the pipeline — it's the source of truth everything else builds from. The "hostile senior engineer" self-review pass specifically benefits from Opus's stronger reasoning; a weak spec here compounds into every later stage. |
| 06 | design-ux-flow | **Fable 5** (or Sonnet 5) | Creative UX/flow design is a Fable strength; Sonnet is fine if you want it fast and plain. |
| 07 | plan-stack | **Haiku 4.5** | Prescriptive — mostly applying `_config.md` defaults. Cheap and fast is right here. |
| 08 | scaffold-mvp | **Sonnet 5**, UI polish pass on **Fable 5** | Sonnet scaffolds the app (strong code quality at sane cost); optionally hand the front-end/visual pass to Fable to make it feel premium. |
| 09 | implement-feature | **Sonnet 5** (default), **Fable 5** for UI-heavy features, escalate to **Opus 4.8** if stuck | Highest-volume stage — Sonnet keeps cost sane and owns the wiring (data/auth/payments). Route the front-end polish of UI-heavy features to Fable; if `/speckit.analyze` flags repeated drift or a feature fights you for 2+ loops, switch that loop to Opus. |
| 10 | qa-plan | **Haiku 4.5** | Checklist generation from an existing spec — mechanical. |
| 11 | write-landing | **Fable 5** | Best single fit for Fable — landing page is design + copy + interaction at once, and it's what drives "this looks legit" trust/conversion. |
| 12 | plan-launch | **Sonnet 5** | Channel judgment calls against `_config.md`. |
| 13 | set-metrics | **Haiku 4.5** | Mechanical: PostHog events from an existing spec. |
| 14 | post-launch-review | **Sonnet 5** | Decision-tree-driven per `_config.md` kill criteria, but real judgment on ambiguous data — worth more than Haiku. |

## Where Fable 5 fits: UI, design, and interactive surface

Fable's creative/frontier tuning shows up strongest in **aesthetic UI, visual design, and novel interactive front-end** — not just prose. So it's worth reaching for on the stages where the *look and feel is the deliverable*, with one hard rule:

**Fable for the surface, Sonnet/Opus for the substance.** Use it for visual polish and interaction; never trust a design-tuned model with correctness-critical logic (payments, auth, data).

| Where | How to use Fable |
|---|---|
| **The visual decision aids** (the HTML widget each skill renders) | Self-contained interactive HTML — Fable's sweet spot. Nicer scorecards/dashboards for near-free. |
| **11 write-landing** | Best single fit — landing page is design + copy + interaction at once. |
| **06 design-ux-flow** | Creative UX ideation and flow design. |
| **08 / 09 — UI layer only** | Fable does the front-end polish pass (components, layout, motion, "feels premium"); Sonnet/Opus wire up data, auth, payments, correctness. |
| **12 plan-launch** | Only the copy artifacts (Reddit/X post text) — channel judgment stays Sonnet. |

Mythos-tier still doesn't fit — no stage here needs it.

## Cost shape this produces

Most calls (01-04, 08, 09 logic, 12, 14) sit on Sonnet 5 — the workhorse. Three mechanical stages (07, 10, 13) drop to Haiku 4.5 for near-zero cost. One stage (05, plus rare 09 escalations) spends on Opus 4.8 where a mistake is genuinely expensive to unwind later. Fable 5 layers on top for the visual/interactive surface — the decision widgets, the landing page (11), UX design (06), and the front-end polish pass on 08/09 — leaving the plumbing on the workhorse models. This is the same "cheap by default, spend where stakes are highest" logic you're already applying to the app's own runtime AI (Gemini Flash default, Claude for edge cases) — just applied to the build process instead of the product.

---

# Applying this to Olim Navigator (current status)

| # | Skill | Status | Model used / to use |
|---|---|---|---|
| 01 | validate-idea | ✅ done (`01-one-pager.md`) | — |
| 02 | research-market | Not yet run | Sonnet 5 |
| 03 | frame-jtbd | Not yet run (informally covered in chat: the "מחיר למשתכן moment") | Sonnet 5 |
| 04 | pick-monetization | Deferred by design — v0.1 ships free, monetization decided post-validation | — |
| 05 | write-spec | ✅ done, but as **lean v0.1** (`07-spec-v0.1-lean.md`), not the full Spec Kit self-reviewed version | Recommend one Opus 4.8 pass to self-review the lean spec before scaffolding — cheap insurance before code exists |
| 06 | design-ux-flow | Not yet run | Fable 5 (creative UX) or Sonnet 5 |
| 07 | plan-stack | Effectively pre-decided: Next.js + Vercel, no Supabase/auth/payments for v0.1 (simpler than `_config.md` default, since v0.1 has no accounts or DB) | Haiku 4.5 to formalize into `08-stack.md` |
| 08 | scaffold-mvp | Not started | Sonnet 5 + Fable 5 UI polish pass |
| 09 | implement-feature | Not started — 3 features to loop: quiz, chat, letter-translation | Sonnet 5 for wiring; Fable 5 for the quiz UI; escalate to Opus per-feature only if stuck |
| 10 | qa-plan | Not started | Haiku 4.5 |
| 11 | write-landing | Not started | Fable 5 |
| 12 | plan-launch | Partially decided: Facebook olim groups + the couple as first testers, not `_config.md`'s default channel list (Reddit/X don't fit this audience) | Sonnet 5 to formalize, noting audience-specific channels override defaults |
| 13 | set-metrics | Not started — note: no PostHog/database yet in v0.1, so this stage needs a lighter version (simple event log, not full PostHog dashboard) | Haiku 4.5 |
| 14 | post-launch-review | N/A until 30 days post-launch | Sonnet 5 |

## Recommended next concrete step

Run skill 06 (design-ux-flow) and skill 07 (plan-stack) next — both are fast, and skill 07 in particular should explicitly note the v0.1 stack is *lighter* than `_config.md`'s default (no Supabase, no auth, no payments), so skill 08's scaffold doesn't over-build. Then skill 08 to scaffold, then loop skill 09 three times for quiz → chat → letter-translation.
