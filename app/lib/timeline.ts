export type Deadline = {
  id: string;            // stable key for the "done" checkbox — survives date recalculation
  title: string;
  note: string;           // one-line summary, shown collapsed
  category: string;
  dueDate: string;
  steps: string[];        // shown when expanded
  link?: { label: string; url: string };
};

function addDays(base: Date, days: number) { const d = new Date(base); d.setDate(d.getDate() + days); return d; }
function addMonths(base: Date, months: number) { const d = new Date(base); d.setMonth(d.getMonth() + months); return d; }
function iso(d: Date) { return d.toISOString().slice(0, 10); }

// A search link is honest about being a search, not a guessed deep-link — gov.il pages
// reorganize often, and a wrong specific URL is worse than a correct generic one.
function searchLink(query: string) {
  return { label: `Search: ${query}`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` };
}

// Deterministic milestone dates from aliyah date — no LLM call, so it's free, instant, and
// can't hallucinate a date. Every date/step below is sourced directly from app/grounding/*.md
// (our own installed skill bundle), not from a third party — cross-check there before editing.
// Specific NIS amounts are deliberately NOT hardcoded; those stay in the grounded chat.
export function computeDeadlines(aliyahDate: string | undefined, hasChildren: boolean, city?: string): Deadline[] {
  if (!aliyahDate) return [];
  const base = new Date(aliyahDate);
  if (isNaN(base.getTime())) return [];

  const items: Deadline[] = [
    {
      id: "bituach-leumi-register",
      title: "Register with Bituach Leumi",
      note: "Recommended within your first week — also triggers your health fund (kupat cholim) coverage.",
      category: "social_security",
      dueDate: iso(addDays(base, 7)),
      steps: [
        "Register at a local Bituach Leumi branch or online.",
        "Bring your Teudat Zehut.",
        "This also activates your kupat cholim (health fund) registration.",
      ],
      // Verified live: real Bituach Leumi page specifically about new-oleh HMO/insurance registration.
      link: { label: "Register — btl.gov.il", url: "https://www.btl.gov.il/English%20Homepage/%D7%9E%D7%99%D7%93%D7%A2%20%D7%9C%D7%A7%D7%94%D7%9C%20%D7%99%D7%A2%D7%93/NewOlim/Pages/HMO_Contributions.aspx" },
    },
    {
      id: "sal-klita-register",
      title: "Register with Misrad HaKlita for Sal Klita",
      note: "Must register within your first year to stay eligible for the absorption basket.",
      category: "ministry_absorption",
      dueDate: iso(addMonths(base, 12)),
      steps: [
        "Register with Misrad HaKlita (if not already done on arrival).",
        "Payments come as: a lump sum at the airport, then monthly installments for months 1–6 (plus a final month-7 payment for couples/families).",
        "Track payments in your personal area at klita.gov.il.",
      ],
      // gov.il blocks automated content verification (403 on every gov.il URL tried) — this is a
      // real, correctly-titled official page per search, just not independently fetch-confirmed.
      link: { label: "Absorption Basket — gov.il", url: "https://www.gov.il/en/pages/absorption_basket" },
    },
    {
      id: "license-foreign-validity",
      title: "Your foreign driver's license stops being valid",
      note: "Valid ~12 months from your last entry to Israel (resets if you leave for 6+ consecutive months).",
      category: "driving",
      dueDate: iso(addMonths(base, 12)),
      steps: [
        "Check how much driving experience you have — it determines your conversion path.",
        "5+ years: administrative conversion only (medical certificate + documents, no test).",
        "2–5 years: a short practical test, no theory test.",
        "Under 2 years: full theory + practical testing.",
      ],
      // No single confirmed gov.il deep-link found for this — a search beats a guessed URL.
      link: searchLink("Misrad HaRishui foreign license conversion new immigrant appointment gov.il"),
    },
    {
      id: "license-conversion-window",
      title: "Driver's license conversion window closes",
      note: "Hard deadline: 5 years from your aliyah date, regardless of experience tier.",
      category: "driving",
      dueDate: iso(addMonths(base, 60)),
      steps: [
        "Book an appointment at Misrad HaRishui.",
        "Bring: foreign license, medical certificate, Teudat Zehut.",
        "After 5 years unconverted, you must complete a full Israeli licensing process regardless of prior experience.",
      ],
      link: searchLink("Misrad HaRishui foreign license conversion new immigrant appointment gov.il"),
    },
    {
      id: "ulpan-enroll",
      title: "Enroll in Ulpan (free Hebrew classes)",
      note: "Must begin within 18 months of aliyah — 500 free hours, 80% attendance required.",
      category: "ministry_absorption",
      dueDate: iso(addMonths(base, 18)),
      steps: [
        "Register through Misrad HaKlita or your local municipality (recommended within your first 1–2 weeks).",
        "Choose a track: morning (5 months, full-time), evening (10 months, for working olim), kibbutz, online, or private.",
        "Attend at least 80% of classes to stay in the subsidized track.",
      ],
      // Registration for Ulpan happens through this same personal-account portal (per search) —
      // gov.il, real page, not independently fetch-confirmed (see note above).
      link: { label: "Personal area — gov.il", url: "https://www.gov.il/en/service/private-area-new-immigrants-and-returning-residents" },
    },
    {
      id: "arnona-discount",
      title: "Arnona (municipal tax) discount window",
      note: "Up to 90% off for your first 12 months — administered locally, not automatic.",
      category: "housing",
      dueDate: iso(addMonths(base, 12)),
      steps: [
        "Contact your local municipality (iriyah) directly — this isn't handled centrally.",
        "Bring proof of oleh status and your registered address.",
        "Confirm the arnona bill is in your name, or the discount won't apply.",
      ],
      // Arnona is per-municipality — there's no single national page, so the city (if known)
      // goes straight into the search instead of a guessed municipal URL.
      link: searchLink(`arnona discount new immigrant ${city || "municipality"} iriya`),
    },
    {
      id: "customs-duty-free",
      title: "Use your duty-free import window",
      note: "3 shipments within 3 years of aliyah (extendable toward ~5 years for IDF service or full-time study).",
      category: "tax",
      dueDate: iso(addMonths(base, 36)),
      steps: [
        "Plan your shipment(s) — you're entitled to 3 separate duty-free shipments in this window.",
        "Know the per-family caps: 3 TVs, 3 computers, 5 phones, one of each major appliance.",
        "Present your Teudat Oleh + Teudat Zehut at customs clearance.",
      ],
      link: searchLink("Israel customs exemption new immigrant meches oleh gov.il"),
    },
  ];

  if (hasChildren) {
    items.push({
      id: "child-savings-plan",
      title: "Activate the Child Savings Plan (Chisachon LeKol Yeled)",
      note: "Opens automatically once your child has a Teudat Zehut — activate within the first month.",
      category: "social_security",
      dueDate: iso(addDays(base, 30)),
      steps: [
        "Log into your Bituach Leumi personal area.",
        "Activate the plan for each child.",
        "Optionally add your own matching contribution and choose a bank account or kupat gemel.",
      ],
      link: searchLink("Bituach Leumi Chisachon LeKol Yeled child savings plan activate personal area"),
    });
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function daysUntil(dueDate: string): number {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
}
