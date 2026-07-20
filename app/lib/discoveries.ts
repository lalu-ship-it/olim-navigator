import type { Lang } from "./i18n";
import type { Answers } from "./quiz";

// Instant, deterministic discoveries for the onboarding handoff. This keeps the app usable
// immediately while the live model refines the checklist in the background.
export function instantDiscoveries(a: Answers, lang: Lang, degraded = false): string {
  const hasChildren = a.family === "family";
  const city = a.city?.trim();
  const copy = {
    en: {
      intro: degraded
        ? "Live personalization is busy right now. Based on your profile, check these first:"
        : "Based on your profile, check these first:",
      sal: "You may need to confirm your absorption basket status with Misrad HaKlita (משרד העלייה והקליטה / סל קליטה).",
      ulpan: "You may have a time-sensitive free Ulpan path to start Hebrew classes (אולפן).",
      health: "Make sure Bituach Leumi and your health fund are fully active (ביטוח לאומי / קופת חולים).",
      arnona: `Ask ${city || "your municipality"} about the new-immigrant Arnona discount (ארנונה). It is local and usually not automatic.`,
      license: "If you drive, check your foreign driver's license conversion window (המרת רישיון נהיגה).",
      children: "For children, check child savings and child-related Bituach Leumi benefits (חיסכון לכל ילד / קצבת ילדים).",
    },
    ru: {
      intro: degraded
        ? "Персонализация временно перегружена. По вашему профилю сначала проверьте это:"
        : "По вашему профилю сначала проверьте это:",
      sal: "Проверьте статус корзины абсорбции в Министерстве алии и интеграции (משרד העלייה והקליטה / סל קליטה).",
      ulpan: "У вас может быть ограниченный по времени путь на бесплатный ульпан (אולפן).",
      health: "Убедитесь, что Битуах Леуми и больничная касса активированы (ביטוח לאומי / קופת חולים).",
      arnona: `Спросите ${city || "ваш муниципалитет"} о скидке на арнону для новых репатриантов (ארנונה). Обычно она не применяется автоматически.`,
      license: "Если вы водите, проверьте срок конвертации иностранного водительского удостоверения (המרת רישיון נהיגה).",
      children: "Для детей проверьте детские накопления и выплаты Битуах Леуми (חיסכון לכל ילד / קצבת ילדים).",
    },
    fr: {
      intro: degraded
        ? "La personnalisation est temporairement occupée. D'après votre profil, vérifiez d'abord ceci:"
        : "D'après votre profil, vérifiez d'abord ceci:",
      sal: "Vérifiez votre statut de panier d'intégration auprès du Misrad HaKlita (משרד העלייה והקליטה / סל קליטה).",
      ulpan: "Vous pouvez avoir un délai à respecter pour commencer l'Ulpan gratuit (אולפן).",
      health: "Assurez-vous que Bituach Leumi et votre caisse maladie sont bien activés (ביטוח לאומי / קופת חולים).",
      arnona: `Demandez à ${city || "votre municipalité"} la réduction d'Arnona pour nouveaux immigrants (ארנונה). Elle n'est généralement pas automatique.`,
      license: "Si vous conduisez, vérifiez votre fenêtre de conversion du permis étranger (המרת רישיון נהיגה).",
      children: "Pour les enfants, vérifiez l'épargne enfant et les droits liés à Bituach Leumi (חיסכון לכל ילד).",
    },
  }[lang];

  const lines = [copy.sal, copy.ulpan, copy.health, copy.arnona, copy.license];
  if (hasChildren) lines.splice(3, 0, copy.children);
  return `${copy.intro}\n\n${lines.map((line) => `- ${line}`).join("\n")}`;
}
