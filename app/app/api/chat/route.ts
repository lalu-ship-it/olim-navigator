import { NextRequest, NextResponse } from "next/server";
import { groundFor } from "@/lib/grounding";
import { discoveryPrompt, type Answers } from "@/lib/quiz";
import type { Lang } from "@/lib/i18n";

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

// Deterministic fallback for F1 discovery when the model is temporarily unavailable.
// It uses only stable v0.1 milestone categories already represented in timeline/grounding,
// and deliberately avoids money amounts or detailed eligibility claims.
function fallbackDiscoveries(a: Answers, lang: Lang): string {
  const hasChildren = a.family === "family";
  const city = a.city?.trim();
  const copy = {
    en: {
      intro: "Live personalization is busy right now. Based on your profile, check these first:",
      sal: "You may need to confirm your absorption basket status with Misrad HaKlita (משרד העלייה והקליטה / סל קליטה).",
      ulpan: "You may have a time-sensitive free Ulpan path to start Hebrew classes (אולפן).",
      health: "Make sure Bituach Leumi and your health fund are fully active (ביטוח לאומי / קופת חולים).",
      arnona: `Ask ${city || "your municipality"} about the new-immigrant Arnona discount (ארנונה). It is local and usually not automatic.`,
      license: "If you drive, check your foreign driver's license conversion window (המרת רישיון נהיגה).",
      children: "For children, check child savings and child-related Bituach Leumi benefits (חיסכון לכל ילד / קצבת ילדים).",
    },
    ru: {
      intro: "Персонализация временно перегружена. По вашему профилю сначала проверьте это:",
      sal: "Проверьте статус корзины абсорбции в Министерстве алии и интеграции (משרד העלייה והקליטה / סל קליטה).",
      ulpan: "У вас может быть ограниченный по времени путь на бесплатный ульпан (אולפן).",
      health: "Убедитесь, что Битуах Леуми и больничная касса активированы (ביטוח לאומי / קופת חולים).",
      arnona: `Спросите ${city || "ваш муниципалитет"} о скидке на арнону для новых репатриантов (ארנונה). Обычно она не применяется автоматически.`,
      license: "Если вы водите, проверьте срок конвертации иностранного водительского удостоверения (המרת רישיון נהיגה).",
      children: "Для детей проверьте детские накопления и выплаты Битуах Леуми (חיסכון לכל ילד / קצבת ילדים).",
    },
    fr: {
      intro: "La personnalisation est temporairement occupée. D'après votre profil, vérifiez d'abord ceci:",
      sal: "Vérifiez votre statut de panier d'intégration auprès du Misrad HaKlita (משרד העלייה והקליטה / סל קליטה).",
      ulpan: "Vous pouvez avoir un délai à respecter pour commencer l'Ulpan gratuit (אולפן).",
      health: "Assurez-vous que Bituach Leumi et votre caisse maladie sont bien activés (ביטוח לאומי / קופת חולים).",
      arnona: `Demandez à ${city || "votre municipalité"} la réduction d'Arnona pour nouveaux immigrants (ארנונה). Elle n'est généralement pas automatique.`,
      license: "Si vous conduisez, vérifiez votre fenêtre de conversion du permis étranger (המרת רישיון נהיגה).",
      children: "Pour les enfants, vérifiez l'épargne enfant et les droits liés à Bituach Leumi (חיסכון לכל ילד / קצבת ילדים).",
    },
  }[lang];

  const lines = [copy.sal, copy.ulpan, copy.health, copy.arnona, copy.license];
  if (hasChildren) lines.splice(3, 0, copy.children);
  return `${copy.intro}\n\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

async function callGemini(system: string, text: string, lang: Lang, image?: { data: string; mime: string }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { answer: stub(text) };
  const parts: any[] = [{ text }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.data } });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }] }),
    });
    const j = await r.json();
    if (!r.ok || j?.error) return { answer: modelBusyMessage(lang, !!image), degraded: true };
    const answer = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) return { answer: modelBusyMessage(lang, !!image), degraded: true };
    return { answer };
  } catch {
    return { answer: modelBusyMessage(lang, !!image), degraded: true };
  }
}

// Claude is an escalation, not a dependency — no key, a bad key, or an outage should
// never break the app. Any failure here falls back to the Gemini path instead of erroring.
async function callClaude(system: string, text: string, lang: Lang, image?: { data: string; mime: string }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return callGemini(system, text, lang, image);
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
  return callGemini(system, text, lang, image);
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

  const { skill, content } = groundFor(routeKey);
  const system = systemPrompt(content, safeLang, profileContext(a));
  const modelResult: ModelResult = needsClaude(userText)
    ? await callClaude(system, userText, safeLang, image)
    : await callGemini(system, userText, safeLang, image);
  const answer = mode === "discover" && modelResult.degraded
    ? fallbackDiscoveries(a, safeLang)
    : modelResult.answer;

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
