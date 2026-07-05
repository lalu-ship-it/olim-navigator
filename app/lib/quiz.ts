import type { Lang } from "./i18n";

// F1 — onboarding quiz. Answers stay in localStorage (see page.tsx); never sent to a DB.
// Some questions only apply to certain family situations — see `showIf` below.
export type Answers = {
  aliyahDate?: string;   // yyyy-mm-dd
  city?: string;
  family?: "single" | "couple" | "family";
  employment?: "employed" | "job-seeking" | "student" | "self-employed";
  countryOfOrigin?: string;
  spouseOleh?: "yes" | "no";
  childrenAges?: string;          // free text, e.g. "3, 8" — precision isn't needed, just age bands
  childrenBornInIsrael?: "yes" | "no" | "some";
  lang?: Lang;
};

type Question = {
  id: keyof Answers;
  q: Record<Lang, string>;
  type: "date" | "text" | "choice";
  options?: { v: string; l: string }[];
  showIf?: (a: Answers) => boolean;
};

export const QUESTIONS: Question[] = [
  { id: "aliyahDate", type: "date", q: { en: "When did you make aliyah?", ru: "Когда вы репатриировались?", fr: "Quand avez-vous fait votre alyah ?" } },
  { id: "city", type: "text", q: { en: "Which city do you live in?", ru: "В каком городе вы живёте?", fr: "Dans quelle ville vivez-vous ?" } },
  { id: "countryOfOrigin", type: "text", q: { en: "Which country are you from?", ru: "Из какой вы страны?", fr: "De quel pays venez-vous ?" } },
  { id: "family", type: "choice", q: { en: "Family status?", ru: "Семейное положение?", fr: "Situation familiale ?" },
    options: [{ v: "single", l: "Single" }, { v: "couple", l: "Couple" }, { v: "family", l: "Family w/ kids" }] },
  { id: "spouseOleh", type: "choice", q: { en: "Is your spouse also a new oleh?", ru: "Ваш супруг(а) тоже новый репатриант?", fr: "Votre conjoint(e) est-il/elle aussi un nouvel oleh ?" },
    options: [{ v: "yes", l: "Yes" }, { v: "no", l: "No" }],
    showIf: (a) => a.family === "couple" || a.family === "family" },
  { id: "childrenAges", type: "text", q: { en: "Ages of the children with you? (e.g. 3, 8)", ru: "Возраст детей? (напр. 3, 8)", fr: "Âge des enfants ? (ex. 3, 8)" },
    showIf: (a) => a.family === "family" },
  { id: "childrenBornInIsrael", type: "choice", q: { en: "Were any of them born in Israel?", ru: "Кто-то из них родился в Израиле?", fr: "Sont-ils nés en Israël ?" },
    options: [{ v: "yes", l: "Yes, all" }, { v: "some", l: "Some" }, { v: "no", l: "No" }],
    showIf: (a) => a.family === "family" },
  { id: "employment", type: "choice", q: { en: "Work status?", ru: "Занятость?", fr: "Statut professionnel ?" },
    options: [{ v: "employed", l: "Employed" }, { v: "job-seeking", l: "Job-seeking" }, { v: "student", l: "Student" }, { v: "self-employed", l: "Self-employed" }] },
];

// Builds the LLM prompt that turns quiz answers into "things you might be missing".
export function discoveryPrompt(a: Answers, lang: Lang): string {
  const bits = [
    `Aliyah date: ${a.aliyahDate || "unknown"}`,
    `City: ${a.city || "unknown"}`,
    `Country of origin: ${a.countryOfOrigin || "unknown"}`,
    `Family: ${a.family || "unknown"}`,
    a.spouseOleh && `Spouse also a new oleh: ${a.spouseOleh}`,
    a.childrenAges && `Children's ages: ${a.childrenAges}`,
    a.childrenBornInIsrael && `Children born in Israel: ${a.childrenBornInIsrael}`,
    `Employment: ${a.employment || "unknown"}`,
  ].filter(Boolean).join(". ");

  return `A new immigrant to Israel filled a short intake. ${bits}.
Based ONLY on the grounding docs, list 3-5 concrete rights, benefits, or processes this person is LIKELY entitled to but commonly does not know about. Frame each as a short discovery ("You may be entitled to…"), one line each, with the Hebrew term in parentheses. Respond in ${lang}. No preamble.`;
}
