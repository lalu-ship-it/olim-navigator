# Tester Launch Runbook

Goal: get Olim Navigator online for a small trusted tester group.

Recommended path: Vercel, importing the `app/` folder as the Next.js project.

## Readiness Level

Good enough for 5-10 trusted testers:
- Next.js build passes.
- `npm audit --omit=dev` is clean.
- The app handles provider failures with useful fallback text.
- No account system or server DB.
- Profile stays in browser `localStorage`.

Not ready for broad public launch until:
- In-memory rate/spend caps are replaced with KV.
- A privacy notice is published.
- Provider dashboard budgets/quotas are configured.
- Git release/rollback path exists.

## 1. Create A Git Baseline

Vercel works best from GitHub.

From the project root:

```bash
git init
git add .
git commit -m "Launch tester beta"
```

Then create a GitHub repo and push it.

## 2. Import To Vercel

In Vercel:
- New Project
- Import the GitHub repo
- Framework Preset: Next.js
- Root Directory: `app`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: leave default

## 3. Production Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```txt
GEMINI_API_KEY=...
DAILY_MSG_CAP=30
NEXT_PUBLIC_DAILY_MSG_CAP=30
GLOBAL_DAILY_SPEND_USD=15
```

Optional:

```txt
ANTHROPIC_API_KEY=...
```

For the beta, Anthropic can stay unset. Long/legal escalation will fall back to Gemini.

Important: keep `DAILY_MSG_CAP` and `NEXT_PUBLIC_DAILY_MSG_CAP` equal.

## 4. Provider Budget Guardrails

For tester beta, do this outside the app:
- Set a daily/monthly budget alert in the Gemini/Google AI dashboard.
- Watch usage manually during the first tester wave.
- Keep the tester group small until KV caps are added.

The in-app global spend cap is still in memory, so it is a helpful local guard but not a production-grade shared cap.

## 5. Smoke Test The Vercel URL

Before sharing with testers, verify:
- Fresh browser opens the quiz.
- Quiz completes and lands on chat.
- Discoveries appear, or deterministic fallback appears if Gemini is busy.
- Deadline card appears after entering an aliyah date.
- Chat question returns an answer or friendly retry message.
- Hebrew-letter upload accepts image files under 10MB.
- RU and FR language buttons change the UI.
- Refresh keeps the profile via localStorage.
- Daily cap message appears if cap is lowered temporarily for testing.

## 6. Share With Testers

Share the Vercel production URL with a small group.

Suggested tester note:

> This is an early beta for Olim bureaucracy help. Please do not upload highly sensitive documents yet. The app does not create an account or store your profile on our server, but questions and uploaded letter images are processed by an AI provider during the request.

## 7. Before Wider Launch

Do these before sharing publicly:
- Replace in-memory `perUser` and `globalSpend` counters with Upstash/Vercel KV.
- Add metadata-only observability: cap result, model, grounding skill, latency, provider status, error class.
- Publish a clear privacy notice.
- Configure provider hard budgets/quotas.
- Tag a release and keep rollback instructions.
