import { NextRequest, NextResponse } from "next/server";
import { groundFor } from "@/lib/grounding";
import { discoveryPrompt, type Answers } from "@/lib/quiz";
import type { Lang } from "@/lib/i18n";
import { instantDiscoveries } from "@/lib/discoveries";

export const runtime = "nodejs"; // needs fs for grounding docs

// --- Cost caps (FR-C2, FR-C3) -------------------------------------------------
// ponytail: in-memory counters reset per process. Correct for local dev and a single
// long-lived instance; Vercel serverless spins up multiple instances, so swap this Map
// for Upstash Redis (KV) BEFORE real traffic or the hard cap leaks. That's the only line
// to change — keep the same read/increment shape.
const DAY = () => new Date().toISOString().slice(0, 10);
const perUser = new Map<string, { day: string; n: number }>();
let globalSpend = { day: DAY(), usd: 0 };

const MSG_CAP = Number(process.env.DAILY_MSG_CAP) || 30;
const SPEND_CAP = Number(process.env.GLOBAL_DAILY_SPEND_USD) || 15;
const COST_PER_MSG = 0.01; // rough Gemini-Flash estimate for the circuit breaker
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const MODEL_TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS) || 10_000;
const CHAT_OUTPUT_TOKENS = Number(process.env.CHAT_OUTPUT_TOKENS) || 900;
const DISCOVERY_OUTPUT_TOKENS = Number(process.env.DISCOVERY_OUTPUT_TOKENS) || 650;

function checkCaps(id: string): "ok" | "user" | "global" {
  const today = DAY();
  if (globalSpend.day !== today) globalSpend = { day: today, usd: 0 };
  if (globalSpend.usd >= SPEND_CAP) return "global";
  const u = perUser.get(id);
  const cur = u && u.day === today ? u : { day: today, n: 0 };
  if (cur.n >= MSG_CAP) return "user";
  perUser.set(id, { day: today, n: cur.n + 1 });
  globalSpend.usd += COST_PER_MSG;
  return "ok";
}

// --- Model routing (FR-C4) ----------------------------------------------------
// Gemini Flash is default for everything, including letter images (its vision handles them fine).
// Escalate to Claude only for genuinely complex/legal text — not just "has an image".
function needsClaude(text: string): boolean {
  return text.length > 1500 || /(court|legal|lawsuit|appeal|ערעור|בית משפט|תביעה)/i.test(text);
}

// Answering shape borrowed from a sibling app's prompt design (not its facts — ours stay
// grounded in the installed skill docs, never a third-party's unaudited numbers).
const PROTOCOL = `Answering protocol for every response:
1. Give the direct answer first.
2. Cite the relevant deadline if one applies (computed from the user's aliyah date when given).
3. Name the specific office, website, or form to use.
4. List the documents needed, if any.
5. Flag the single most common pitfall, if the grounding material mentions one.
6. Personalize using the user's profile below when relevant (family size → sal klita scale, children → child allowance, country of origin → license conversion path).
For license conversion specifically: that's handled by the Aliyah Navigator material, not a vehicle-registration process — don't confuse the two.`;

function profileContext(a: Answers): string {
  const bits = [
    a.aliyahDate && `aliyah date: ${a.aliyahDate}`,
    a.city && `city: ${a.city}`,
    a.countryOfOrigin && `country of origin: ${a.countryOfOrigin}`,
    a.family && `family status: ${a.family}`,
    a.spouseOleh && `spouse also a new oleh: ${a.spouseOleh}`,
    a.childrenAges && `children's ages: ${a.childrenAges}`,
    a.childrenBornInIsrael && `children born in Israel: ${a.childrenBornInIsrael}`,
    a.employment && `employment: ${a.employment}`,
  ].filter(Boolean);
  return bits.length ? `User profile — ${bits.join(", ")}.` : "";
}

function systemPrompt(grounding: string, lang: string, profileCtx: string): string {
  return `You are Olim Navigator, an assistant for new immigrants to Israel. Answer in ${lang}, in plain language.
Rules: Only use the grounding material below. If it doesn't cover the question, say so and suggest the official source — never invent specifics (form numbers, sums, deadlines). Add the Hebrew term in parentheses for any office/benefit you name.

${PROTOCOL}

${profileCtx}

=== GROUNDING ===
${grounding}`;
}

function discoveryGrounding(): string {
  return `Fast discovery grounding for new immigrants to Israel:
- Misrad HaKlita (משרד העלייה והקליטה) handles Teudat Oleh, absorption guidance, Sal Klita status, Ulpan referral, and the online personal area.
- Sal Klita (סל קליטה) depends on immigrant status, family composition, and timing. Tell users to verify exact eligibility and payments in the Misrad HaKlita personal area.
- Ulpan (אולפן) is a key time-sensitive Hebrew-learning benefit for many olim. The user should confirm the available track and registration window with Misrad HaKlita.
- Health setup usually requires Bituach Leumi (ביטוח לאומי) and choosing a kupat cholim (קופת חולים). Missing activation can block services.
- Municipal Arnona (ארנונה) discounts are local. The user must ask the municipality where they live; it is usually not automatic.
- Foreign driver's license conversion (המרת רישיון נהיגה) is time-sensitive and belongs to the aliyah/license conversion path, not vehicle registration.
- Families with children should check Bituach Leumi child allowance and Child Savings Plan (חיסכון לכל ילד), and school/municipal absorption support.
- For refunds, customs, shipping, bank, apartment, car, legal, or medical-specific questions, ask a focused follow-up so the app can route to the right grounded guide.

Discovery answer style:
- Return 4-6 concrete "you may be missing this" bullets.
- Add a short "what to do next" section.
- Avoid exact money amounts unless present in the user-provided context.
- Use deadlines only when they can be computed from the user's aliyah date or described safely as "check this window now".`;
}

type ModelResult = { answer: string; degraded?: boolean };

function normalizeLang(lang: unknown): Lang {
  return lang === "ru" || lang === "fr" ? lang : "en";
}

function modelBusyMessage(lang: Lang, hasImage: boolean): string {
  const copy = {
    en: hasImage
      ? "I can't analyze the letter right now because the AI service is busy. Please try again in a few minutes. Your image was not stored."
      : "I can't reach the AI service right now. Please try again in a few minutes; your profile and deadline card are still saved locally.",
    ru: hasImage
      ? "Сейчас не получается разобрать письмо: AI-сервис перегружен. Попробуйте ещё раз через несколько минут. Изображение не сохранялось."
      : "Сейчас не получается подключиться к AI-сервису. Попробуйте ещё раз через несколько минут; ваш профиль и сроки сохранены только локально.",
    fr: hasImage
      ? "Je ne peux pas analyser la lettre pour le moment: le service IA est occupé. Réessayez dans quelques minutes. L'image n'a pas été enregistrée."
      : "Je ne peux pas joindre le service IA pour le moment. Réessayez dans quelques minutes; votre profil et vos échéances restent enregistrés localement.",
  };
  return copy[lang];
}

async function callGemini(system: string, text: string, lang: Lang, image: { data: string; mime: string } | undefined, maxOutputTokens: number): Promise<ModelResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { answer: stub(text) };
  const parts: any[] = [{ text }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.data } });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: "POST", headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { maxOutputTokens, temperature: 0.2 },
      }),
    });
    const j = await r.json();
    if (!r.ok || j?.error) {
      console.warn("olim_model_error", {
        provider: "gemini",
        model: GEMINI_MODEL,
        status: r.status,
        reason: j?.error?.status || j?.error?.message || "bad_response",
      });
      return { answer: modelBusyMessage(lang, !!image), degraded: true };
    }
    const answer = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) return { answer: modelBusyMessage(lang, !!image), degraded: true };
    return { answer };
  } catch (error) {
    console.warn("olim_model_error", {
      provider: "gemini",
      model: GEMINI_MODEL,
      status: "fetch_failed",
      reason: error instanceof Error ? error.name : "unknown",
    });
    return { answer: modelBusyMessage(lang, !!image), degraded: true };
  } finally {
    clearTimeout(timeout);
  }
}

// Claude is an escalation, not a dependency — no key, a bad key, or an outage should
// never break the app. Any failure here falls back to the Gemini path instead of erroring.
async function callClaude(system: string, text: string, lang: Lang, image?: { data: string; mime: string }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return callGemini(system, text, lang, image, CHAT_OUTPUT_TOKENS);
  try {
    const content: any[] = [{ type: "text", text }];
    if (image) content.unshift({ type: "image", source: { type: "base64", media_type: image.mime, data: image.data } });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1024, system, messages: [{ role: "user", content }] }),
    });
    const j = await r.json();
    if (j?.content?.[0]?.text) return { answer: j.content[0].text };
  } catch {}
  return callGemini(system, text, lang, image, CHAT_OUTPUT_TOKENS);
}

// No API key yet → return a visible stub so the UI is fully testable.
function stub(text: string) {
  return `⟨stub — no API key set⟩ You asked: "${text.slice(0, 120)}". Add GEMINI_API_KEY to .env.local to get a real grounded answer.`;
}

// Cost caps assume roughly bounded input — an unbounded message would blow past the
// per-message cost estimate the circuit breaker (COST_PER_MSG) relies on.
const MAX_TEXT_LEN = 4000;
// FR-4: images are capped at a reasonable size (10MB original ~= 13.3MB as base64).
const MAX_IMAGE_B64_LEN = 14_000_000;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const { text = "", lang = "en", image, mode, quiz } = await req.json();
  const safeLang = normalizeLang(lang);

  if (typeof text === "string" && text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ answer: "That message is too long — please shorten it and try again." });
  }
  if (image?.data && image.data.length > MAX_IMAGE_B64_LEN) {
    return NextResponse.json({ answer: "That image is too large (10MB max) — please use a smaller photo." });
  }

  // Cookie-based random id (FR-C2) — a rate-limit handle, not user data.
  let id = req.cookies.get("olim_id")?.value;
  const setCookie = !id;
  if (!id) id = crypto.randomUUID();

  const cap = checkCaps(id);
  if (cap !== "ok") return NextResponse.json({ capped: cap });

  // F1 discovery: build the prompt from quiz answers; otherwise it's a chat/letter turn.
  const a: Answers = quiz || {};
  const userText = mode === "discover" ? discoveryPrompt(a, safeLang) : text;
  // Route grounding on the query, falling back to the quiz city/status for the discovery call.
  const routeKey = mode === "discover" ? `${a.employment} ${a.family} aliyah sal klita` : text;

  const { skill, content } = mode === "discover"
    ? { skill: "fast-discovery", content: discoveryGrounding() }
    : groundFor(routeKey);
  const system = systemPrompt(content, safeLang, profileContext(a));
  const modelStartedAt = Date.now();
  const modelResult: ModelResult = needsClaude(userText)
    ? await callClaude(system, userText, safeLang, image)
    : await callGemini(system, userText, safeLang, image, mode === "discover" ? DISCOVERY_OUTPUT_TOKENS : CHAT_OUTPUT_TOKENS);
  const answer = mode === "discover" && modelResult.degraded
    ? instantDiscoveries(a, safeLang, true)
    : modelResult.answer;

  console.info("olim_api_timing", {
    mode: mode || "chat",
    skill,
    model: needsClaude(userText) ? "claude-or-gemini-fallback" : GEMINI_MODEL,
    groundedChars: content.length,
    modelMs: Date.now() - modelStartedAt,
    totalMs: Date.now() - startedAt,
    degraded: !!modelResult.degraded,
  });

  const res = NextResponse.json({ answer, skill });
  if (setCookie) {
    res.cookies.set("olim_id", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
