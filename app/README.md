# Olim Navigator (v0.1)

Conversational assistant for new immigrants to Israel — bureaucracy explained in English / Russian / French, grounded in the Olim Chadashim Starter skill bundle.

## Features (v0.1)
- **F1 — Quiz:** 5 questions → personalized "things you might be missing" (localStorage, no account).
- **F2 — Chat:** grounded Q&A in your language.
- **F3 — Letter:** photograph a Hebrew letter → plain-language explanation + action/deadline.

## Run
```bash
cp .env.example .env.local   # optional: add GEMINI_API_KEY / ANTHROPIC_API_KEY
npm install
npm run dev                  # http://localhost:3000
```
Without API keys the app is fully clickable and returns visible `⟨stub⟩` replies, so you can test the whole flow before wiring models.

## Structure
- `app/page.tsx` — the entire UI (quiz → discoveries → chat/letter), client-side daily cap.
- `app/api/chat/route.ts` — cost caps, grounding injection, model routing (Gemini→Claude).
- `lib/grounding.ts` — keyword router over `app/grounding/*.md`.
- `lib/quiz.ts`, `lib/i18n.ts` — quiz data + UI strings.

See `CLAUDE.md` for the rules and known ceilings.
