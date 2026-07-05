"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { t, LANGS, type Lang } from "@/lib/i18n";
import { QUESTIONS, type Answers } from "@/lib/quiz";
import { computeDeadlines, daysUntil, type Deadline } from "@/lib/timeline";

type Msg = { role: "user" | "bot"; text: string };
// FR-C1 soft client-side counter — a pre-check to save a round-trip; the server's
// DAILY_MSG_CAP is authoritative. Keep NEXT_PUBLIC_DAILY_MSG_CAP equal to DAILY_MSG_CAP
// (Next.js can't share one env var between server and client), or this silently drifts.
const CLIENT_CAP = Number(process.env.NEXT_PUBLIC_DAILY_MSG_CAP) || 30;

// FR-C1: client-side daily message counter in localStorage.
function bumpDailyCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  const raw = JSON.parse(localStorage.getItem("olim_count") || "{}");
  const n = raw.day === today ? raw.n + 1 : 1;
  localStorage.setItem("olim_count", JSON.stringify({ day: today, n }));
  return n;
}

// emoji flavor for choice options — pure presentation
const OPTION_EMOJI: Record<string, string> = {
  single: "🙋", couple: "💑", family: "👨‍👩‍👧",
  employed: "💼", "job-seeking": "🔍", student: "🎓", "self-employed": "🚀",
  yes: "✅", no: "➖", some: "🔹",
};

// Some questions only apply given earlier answers (e.g. spouse/kids questions only for
// couples/families) — filter fresh each time so the list reflects answers so far.
function activeQuestionsFor(a: Answers) {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(a));
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<"quiz" | "discovering" | "chat">("quiz");
  const [step, setStep] = useState(0); // index into activeQuestions, only meaningful during "quiz"
  const [discoveries, setDiscoveries] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [capped, setCapped] = useState<"" | "user" | "global">("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const L = t[lang];

  const activeQuestions = useMemo(() => activeQuestionsFor(answers), [answers]);

  // Local-only task tracking for the deadlines card — no server, matches Zero-Server-Privacy.
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  function toggleDone(id: string) {
    setDoneIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("olim_tasks_done", JSON.stringify(next));
      return next;
    });
  }

  // Restore saved profile (AC-7).
  useEffect(() => {
    const saved = localStorage.getItem("olim_profile");
    if (saved) {
      const p = JSON.parse(saved);
      setAnswers(p.answers || {});
      setLang(p.answers?.lang || "en");
      // Any saved profile — full completion or a skip — means onboarding is done; resume at
      // chat instead of re-asking the quiz. Empty discoveries (skip case) just hides that card.
      setDiscoveries(p.discoveries || null);
      setPhase("chat");
    }
    const savedDone = localStorage.getItem("olim_tasks_done");
    if (savedDone) setDoneIds(JSON.parse(savedDone));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  // Deterministic — no LLM call, computed instantly from the quiz's aliyah date.
  const deadlines = useMemo(() => computeDeadlines(answers.aliyahDate, answers.family === "family", answers.city), [answers.aliyahDate, answers.family, answers.city]);

  const inQuiz = phase === "quiz";
  const onResults = phase === "discovering";

  async function api(body: object) {
    if (bumpDailyCount() > CLIENT_CAP) { setCapped("user"); return null; }
    setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.capped) { setCapped(j.capped); return null; }
      return j.answer as string;
    } finally { setBusy(false); }
  }

  async function finishQuiz(a: Answers) {
    const profile = { ...a, lang };
    setPhase("discovering");
    const ans = await api({ text: "quiz-discoveries", lang, quiz: profile, mode: "discover" });
    const text = ans || "";
    setDiscoveries(text);
    localStorage.setItem("olim_profile", JSON.stringify({ answers: profile, discoveries: text }));
    setPhase("chat");
  }

  async function send(text: string, image?: { data: string; mime: string }) {
    if (!text.trim() && !image) return;
    setMsgs((m) => [...m, { role: "user", text: image ? "🖼️ " + (text || L.uploadLetter) : text }]);
    setInput("");
    const ans = await api({ text, lang, image, quiz: { ...answers, lang } });
    if (ans) setMsgs((m) => [...m, { role: "bot", text: ans }]);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { // FR-4: 10MB limit — check before upload, not after
      setMsgs((m) => [...m, { role: "bot", text: "That image is too large (10MB max) — please use a smaller photo." }]);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result).split(",")[1];
      send("Explain this Hebrew letter: what is it, is action needed, by when?", { data, mime: f.type });
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  if (capped) {
    return (
      <Center>
        <div className="anim-pop card-soft max-w-sm rounded-2xl p-8">
          <div className="mb-3 text-4xl">🌙</div>
          <p className="text-lg font-medium">{capped === "global" ? L.globalCap : L.capReached}</p>
        </div>
      </Center>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-8 sm:px-8">
      {/* header */}
      <header className="anim-fade-up mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl shadow-lg shadow-blue-900/20">🧭</div>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{L.title}</h1>
            <p className="text-sm text-slate-500">{L.tagline}</p>
          </div>
        </div>
        {/* language pills */}
        <div className="flex shrink-0 gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${lang === l.code ? "bg-[var(--accent)] text-white" : "text-slate-500 hover:text-slate-800"}`}>
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {inQuiz && (
        <QuizStep
          key={step} lang={lang} index={step} questions={activeQuestions}
          onSkip={() => {
            // Keep whatever was answered so far — losing it on skip would be a worse experience
            // than an incomplete profile, and a reload would otherwise force a full re-quiz.
            const profile = { ...answers, lang };
            localStorage.setItem("olim_profile", JSON.stringify({ answers: profile, discoveries: "" }));
            setPhase("chat");
          }}
          onAnswer={(v) => {
            const a = { ...answers, [activeQuestions[step].id]: v, lang };
            setAnswers(a);
            const next = activeQuestionsFor(a);
            if (step + 1 >= next.length) finishQuiz(a); else setStep(step + 1);
          }}
        />
      )}

      {onResults && (
        <Center>
          <div className="anim-pop text-center">
            <div className="mb-4 text-5xl">✨</div>
            <p className="font-display text-xl">{L.thinking}</p>
            <ThinkingDots />
          </div>
        </Center>
      )}

      {phase === "chat" && (
        <>
          {discoveries && (
            <section className="anim-pop card-soft mb-8 overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/60 px-5 py-3">
                <span className="text-xl">🎁</span>
                <h2 className="font-display text-lg font-semibold">{L.discoveries}</h2>
              </div>
              <div className="p-5 text-sm leading-relaxed">
                <Prose text={discoveries} />
              </div>
            </section>
          )}

          {deadlines.length > 0 && (
            <section className="anim-pop card-soft mb-8 overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-[var(--accent-soft)] to-transparent px-5 py-3">
                <span className="text-xl">📅</span>
                <h2 className="font-display text-lg font-semibold">Your key deadlines</h2>
              </div>
              <ul className="stagger space-y-2 p-5">
                {deadlines.map((d) => (
                  <DeadlineItem key={d.id} d={d} done={!!doneIds[d.id]} expanded={expandedId === d.id}
                    onToggleDone={() => toggleDone(d.id)}
                    onToggleExpand={() => setExpandedId(expandedId === d.id ? null : d.id)} />
                ))}
              </ul>
            </section>
          )}

          {/* chat thread */}
          <section className="space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={`anim-fade-up flex items-end gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "bot" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm shadow-md shadow-blue-900/20">🧭</div>
                )}
                <span className={`inline-block max-w-[82%] px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--accent)] text-white shadow-md shadow-blue-900/20"
                    : "card-soft rounded-2xl rounded-bl-md"
                }`}>
                  {m.role === "bot" ? <Prose text={m.text} /> : m.text}
                </span>
              </div>
            ))}
            {busy && (
              <div className="anim-fade-up flex items-end gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm">🧭</div>
                <span className="card-soft rounded-2xl rounded-bl-md px-4 py-3"><ThinkingDots /></span>
              </div>
            )}
            <div ref={endRef} />
          </section>

          {/* composer */}
          <div className="sticky bottom-0 mt-6 pb-2 pt-3" style={{ background: "linear-gradient(to top, var(--sand) 70%, transparent)" }}>
            <div className="card-soft flex items-center gap-1.5 rounded-full p-1.5 pl-5">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder={L.askPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
              <button onClick={() => fileRef.current?.click()} title={L.uploadLetter}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition-colors hover:bg-[var(--accent-soft)]">📷</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
              <button onClick={() => send(input)} disabled={busy}
                className="h-10 shrink-0 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-white shadow-md shadow-blue-900/25 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50">
                {L.send}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function QuizStep({ index, lang, questions, onAnswer, onSkip }: { index: number; lang: Lang; questions: typeof QUESTIONS; onAnswer: (v: string) => void; onSkip: () => void }) {
  const q = questions[index];
  const [val, setVal] = useState("");
  const pct = (index / questions.length) * 100;
  return (
    <section className="anim-pop card-soft rounded-2xl p-6 sm:p-8">
      {/* progress */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="progress-fill h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--gold)]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-medium text-slate-400">{index + 1} / {questions.length}</span>
      </div>

      <h2 className="font-display mb-6 text-xl font-semibold sm:text-2xl">{q.q[lang]}</h2>

      {q.type === "choice" ? (
        <div className="stagger grid grid-cols-2 gap-3">
          {q.options!.map((o) => (
            <button key={o.v} onClick={() => onAnswer(o.v)}
              className="choice-btn card-soft flex items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium">
              <span className="text-xl">{OPTION_EMOJI[o.v] ?? "•"}</span>{o.l}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <input type={q.type === "date" ? "date" : "text"} value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && val && onAnswer(val)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" autoFocus />
          <button onClick={() => onAnswer(val)} disabled={!val.trim()}
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-md shadow-blue-900/25 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100">
            {t[lang].next}
          </button>
        </div>
      )}
      <button onClick={onSkip} className="mt-5 text-xs text-slate-400 underline-offset-2 transition-colors hover:text-slate-600 hover:underline">{t[lang].skip}</button>
    </section>
  );
}

// Shared markdown rendering for anything the model writes (chat answers, discoveries) —
// LLM output regularly includes **bold**/lists/links; render it, don't show raw asterisks.
function Prose({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="my-1 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-1">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold text-[var(--accent)]">{children}</strong>,
        h3: ({ children }) => <h3 className="mb-1 mt-2 font-display font-semibold">{children}</h3>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">{children}</a>,
      }}
    >{text}</ReactMarkdown>
  );
}

// Click to expand step-by-step instructions + a link; checkbox marks it done (localStorage only).
function DeadlineItem({ d, done, expanded, onToggleDone, onToggleExpand }: {
  d: Deadline; done: boolean; expanded: boolean; onToggleDone: () => void; onToggleExpand: () => void;
}) {
  return (
    <li className={`overflow-hidden rounded-xl bg-slate-50 transition-opacity ${done ? "opacity-50" : ""}`}>
      <div className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm" onClick={onToggleExpand}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
          aria-label="Mark done"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors"
          style={done ? { background: "var(--accent)", borderColor: "var(--accent)", color: "white" } : { borderColor: "#cbd5e1" }}
        >
          {done ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${done ? "line-through" : ""}`}>{d.title}</p>
          <p className="text-xs text-slate-500">{d.note}</p>
        </div>
        <DeadlineChip dueDate={d.dueDate} />
        <span className="shrink-0 text-xs text-slate-400">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="anim-fade-up border-t border-slate-200 bg-white px-4 py-3 text-sm">
          <ol className="ml-4 list-decimal space-y-1.5 text-slate-700">
            {d.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {d.link && (
            <a href={d.link.url} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline">
              → {d.link.label}
            </a>
          )}
        </div>
      )}
    </li>
  );
}

function DeadlineChip({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate);
  const style = days < 0 ? "bg-red-50 text-red-600 border-red-200"
    : days < 30 ? "bg-orange-50 text-orange-600 border-orange-200"
    : days < 90 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  const label = days < 0 ? "Overdue" : `${days}d left`;
  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="dot h-1.5 w-1.5 rounded-full bg-slate-400" />
      <span className="dot h-1.5 w-1.5 rounded-full bg-slate-400" />
      <span className="dot h-1.5 w-1.5 rounded-full bg-slate-400" />
    </span>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center text-center">{children}</div>;
}
