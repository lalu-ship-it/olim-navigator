import { readFileSync } from "fs";
import { join } from "path";

// Keyword -> skill file. Picks the single most relevant grounding doc for a query.
// ponytail: flat keyword match, not embeddings. Add a vector index only if routing measurably misses.
// ponytail note: keep every keyword here SPECIFIC to its own skill. Generic words ("oleh",
// "aliyah", "benefit", "form") appear in almost every query regardless of topic — since ties
// favor whichever route is checked first, a generic keyword lets the wrong route win a tie
// against a more specific one (e.g. "find an apartment as an oleh" misrouting to aliyah-navigator
// via "oleh" instead of apartment-hunting via "apartment"). When everything scores 0, the
// ROUTES[0] default (aliyah-navigator) already covers genuinely generic aliyah questions —
// so dropping the generic keywords loses nothing and fixes the false positives.
const ROUTES: { skill: string; keywords: string[] }[] = [
  { skill: "israeli-aliyah-navigator", keywords: ["sal klita", "klita", "misrad haklita", "absorption", "ulpan", "teudat oleh", "license conversion", "license", "tax exempt", "nefesh", "arnona", "municipality", "municipal"] },
  { skill: "israeli-bituach-leumi", keywords: ["bituach leumi", "national insurance", "pension", "zikna", "unemployment", "avtala", "maternity", "leida", "child allowance", "yeladim", "disability", "nechut", "miluim", "havtachat hachnasa", "kitzba"] },
  { skill: "israeli-hmo-navigator", keywords: ["kupat cholim", "kupah", "hmo", "health", "clalit", "maccabi", "meuhedet", "leumit", "doctor", "referral", "hafnaya", "briut", "insurance mashlim"] },
  { skill: "israeli-apartment-hunting", keywords: ["apartment", "rent", "rental", "dira", "yad2", "madlan", "landlord", "lease", "broker", "tenant", "housing", "neighborhood"] },
  { skill: "israeli-vehicle-manager", keywords: ["car", "vehicle", "test", "rechev", "registration", "rishayon", "used car", "insurance rechev"] },
  { skill: "israeli-bank-connector", keywords: ["bank", "cheshbon", "account", "credit card", "transaction", "spending", "hapoalim", "leumi", "mizrahi"] },
  { skill: "israeli-aliyah-customs-shipment-planner", keywords: ["customs", "shipment", "lift", "shipping", "meches", "container", "duty-free", "appliance", "bring"] },
];

const DIR = join(process.cwd(), "grounding");
const cache = new Map<string, string>();
const DEFAULT_MAX_GROUNDING_CHARS = 9000;

function load(skill: string): string {
  if (!cache.has(skill)) cache.set(skill, readFileSync(join(DIR, `${skill}.md`), "utf8"));
  return cache.get(skill)!;
}

function compact(content: string, query: string, maxChars = DEFAULT_MAX_GROUNDING_CHARS): string {
  if (content.length <= maxChars) return content;
  const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
  const blocks = content.split(/\n{2,}/);
  const intro = blocks.slice(0, 3).join("\n\n");
  const picked: string[] = [];

  for (const block of blocks) {
    const lower = block.toLowerCase();
    if (terms.some((term) => lower.includes(term))) picked.push(block);
    if ([intro, ...picked].join("\n\n").length >= maxChars) break;
  }

  const result = [intro, ...picked].join("\n\n").slice(0, maxChars);
  return `${result}\n\n[Grounding compacted for latency. Ask a focused follow-up if more detail is needed.]`;
}

// Returns the grounding markdown for the best-matching skill, or the aliyah default.
export function groundFor(text: string, maxChars = DEFAULT_MAX_GROUNDING_CHARS): { skill: string; content: string } {
  const q = text.toLowerCase();
  let best = ROUTES[0], score = 0;
  for (const r of ROUTES) {
    const s = r.keywords.reduce((n, k) => n + (q.includes(k) ? 1 : 0), 0);
    if (s > score) { score = s; best = r; }
  }
  return { skill: best.skill, content: compact(load(best.skill), text, maxChars) };
}
