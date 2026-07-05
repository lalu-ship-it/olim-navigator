# Olim Bureaucracy Navigator

**One-liner:** A conversational assistant that answers Israeli bureaucracy questions for new immigrants in their native language (English, Russian, French) and actively guides/assists them in executing tasks.

**Target user:** Non-Hebrew speaking Olim (immigrants) who arrived in Israel within the last 2 years and struggle with government bureaucracy.

**Painful situation today:** Olim half-solve this by copying and pasting Hebrew government portal text into Google Translate, asking for advice in noisy Facebook groups (yielding slow or conflicting crowd-sourced info), or waiting weeks for bureaucratic assistance from Nefesh B'Nefesh or absorption advisors.

**Why now:**
1. **Agentic API wrappers:** The release of the `Olim Chadashim Starter` package from AgentSkills makes wrapping Israeli APIs/bureaucratic actions feasible for LLMs.
2. **Advanced Cross-Lingual LLMs:** Modern models (like Gemini/Claude) are mature enough to accurately parse complex Hebrew legal documents (e.g. Kol Zchut) and reason/respond natively in Russian, French, or English without losing nuance.
3. **Digitization of Gov Services:** The Israeli government has digitized more services via myGov (Gov.il), creating a centralized surface area that can be automated or assisted.

**Monetization hypothesis:** Hybrid model: Free to ask questions. $29 one-time "Bureaucracy Pass" for lifetime access to core guides/checklists, OR $9.99 credit packs (5 actions) to perform premium tasks like auto-filling specific Hebrew PDFs, analyzing custom government letters, or step-by-step interactive form guidance.

**Security & Trust Model:**
*   **Zero-Server Privacy:** 100% client-side local storage (IndexedDB) for all personal details, government credentials, and uploaded PDFs. No personal information or credentials are saved on a central database, resolving trust barriers.

**Out of scope (v1):**
1. Full automated write transactions or automated biometric logins on myGov (v1 acts as a client-side guide and pre-fills forms for manual user upload).
2. Official legal representation or advocacy in court/ministry offices.
3. Complex business tax filing or foreign asset declarations (focus on basic personal rights like Sal Klita, Arnona discount, driver's license conversion).
4. Support for languages other than English, Russian, and French.

**Success in 30 days:** 25 paying users (Pass or credit pack purchases) and >100 active users navigating at least one bureaucratic process.
