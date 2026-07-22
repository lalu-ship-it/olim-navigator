import { NextRequest, NextResponse } from "next/server";

type FeedbackRating = "helpful" | "not-helpful" | "too-slow";

const RATINGS = new Set<FeedbackRating>(["helpful", "not-helpful", "too-slow"]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rating = body.rating as FeedbackRating;
  if (!RATINGS.has(rating)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Privacy-light beta signal: no user text, answer text, image, or profile is logged.
  console.info("olim_feedback", {
    rating,
    answerId: String(body.answerId || "").slice(0, 80),
    skill: String(body.skill || "unknown").slice(0, 80),
    lang: String(body.lang || "unknown").slice(0, 8),
    ts: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
