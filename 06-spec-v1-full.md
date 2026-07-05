# Spec: Olim Bureaucracy Navigator

## Constitution
Non-negotiable rules for this project (see also _config.md global).
- **Zero-Server Privacy:** Under no circumstances shall user-uploaded letters, extracted personal details, or government login credentials be stored on the server database or local disk. The server only performs ephemeral OCR/translation processing (files must be deleted from memory/temp space within 60 seconds of processing).
- **Client-Side Form Filling:** PDF form pre-filling must be executed entirely client-side in the browser using JavaScript to prevent sensitive personal information (passports, IDs) from being transmitted to the server.
- **Entitlement Enforcement:** All credit checks and deductions must happen server-side before executing LLM/OCR actions.
- **Single Source of Truth:** This specification is the absolute source of truth. Any changes in code behavior must be reflected here first.
- **Gemini-First Cost Efficiency:** Use Gemini 1.5 Flash for 90% of chat queries and OCR translations. Route to Claude 3.5 Sonnet only for highly complex legal document parsing or edge case translation.
- **Prompt Caching:** Enable server-side prompt caching for knowledge bases to reduce LLM input token costs by up to 90%.

## Overview
Olim Bureaucracy Navigator is a web application designed to help non-Hebrew speaking new immigrants (Olim) in Israel navigate bureaucracy in their native language (English, Russian, French). The app provides conversational guidance, translates and extracts action items from Hebrew government letters, and generates pre-filled Hebrew PDF forms, monetized through a hybrid model of a $29 Aliyah Pass (50 credits) and $9.99 credit top-up packs.

## User Scenarios & Testing

### Primary Scenario: Document Translation & Action Extraction
Sarah receives a physical letter in Hebrew from the municipal tax (Arnona) office. She goes to the app, registers an account, and gets 3 free credits. She uploads a photo of the letter. The system ephemerally processes the image, translates the Hebrew text to French, and extracts the key details: amount due (120 NIS), deadline (June 15th), and the payment portal link. The system deducts 1 credit from her account. Sarah sees the French translation, reviews the parsed due date and payment link on her dashboard, clicks the link to pay, and marks the task as completed.

### Primary Scenario: Form Pre-filling
Sarah needs to convert her foreign driver's license. She asks the chat assistant how to do it. The assistant explains the step-by-step process in French and offers to pre-fill the official form. Sarah fills out her profile details (name, passport number, country of origin, Aliyah date) which are saved locally in her browser. She clicks "Generate Form". The system checks her credit balance, deducts 1 credit, and client-side code overlays her profile data onto the Hebrew driver's license PDF template. The pre-filled PDF downloads to her device.

### Edge Scenario: Insufficient Credits
A user with 0 credits attempts to upload a letter or generate a pre-filled PDF. The system intercepts the request, displays a friendly low-credit modal with a call-to-action to buy a Credit Top-Up Pack or Aliyah Pass, and blocks the server execution.

### Edge Scenario: OCR Failure or Unreadable Image
A user uploads a blurry photo of a Hebrew letter. The system attempts to read it, fails to parse it, displays a clear error message instructing the user to upload a clearer, well-lit photo, and rolls back the credit deduction (0 credits charged).

---

## Functional Requirements
- **FR-1:** User registration and authentication.
- **FR-2:** Multilingual user interface (supporting English, Russian, and French).
- **FR-3:** Conversational chat interface to ask questions about Aliyah bureaucracy, rights, and checklists.
- **FR-4:** Local-first user profile storage (name, ID number, address, entry date) saved only in the browser (localStorage/IndexedDB) and never sent to the server database.
- **FR-5:** File upload interface (supporting JPEG, PNG, PDF up to 10MB) for Hebrew government letters.
- **FR-6:** Ephemeral OCR and LLM-based translation and action extraction (amount, deadline, action, link) in the user's selected language.
- **FR-7:** Client-side Hebrew PDF form generation from the local user profile.
- **FR-8:** Personal task dashboard to track Aliyah checklists, uploaded letters, and deadlines.
- **FR-9:** Credit system (checking balance, deducting credits server-side for OCR scans, PDF generation, or chat batches).
- **FR-10:** Chat message credit deduction tracking (deducts 1 credit for every 5 messages sent; session tracks partial count).
- **FR-11:** Checkout integration for Aliyah Pass ($29 for 50 credits) and Credit Top-Up ($9.99 for 20 credits).
- **FR-12:** Webhook handler to increment credit balance upon LemonSqueezy checkout success.
- **FR-13:** Ephemeral file handling (uploaded documents are deleted immediately after OCR/translation completes or fails).
- **FR-14:** WhatsApp/Telegram companion bot connection allowing users to snap photos of Hebrew letters and receive parsed translation summaries inline (linking back to web app for payment/form filling).
- **FR-15:** Split-screen PDF preview overlay, displaying the official Hebrew document on the left and native-language text input fields on the right, updating in real-time.
- **FR-16:** Location-based office guide finder, displaying mapped directions, operating hours, and document requirements for physical government office visits.
- **FR-17:** Dynamic chat quick-action bubbles in the empty chat state to start instant queries.

---

## Key Entities
- **User:** Represents the immigrant. Stores user account reference, email, current credit balance, language preference, and signup date.
- **CreditTransaction:** Represents credit deductions or purchases. Tracks user ID, amount, type (deduction/purchase), description, and timestamp.
- **Task:** Represents an item in the user's checklist. Tracks user ID, title, description, status (not started, in progress, done), deadline, and source document translation reference. It also tracks **Subtasks** (an ordered array of sequential steps, e.g., 'Eye check', 'Green form') to clarify complex multi-step prerequisites.
- **DocumentScan:** Ephemeral metadata of an uploaded document. Tracks user ID, extraction payload (amount, deadline, payment link, raw translation text), and creation timestamp. No file binaries are saved on the server.

---

## Acceptance Criteria
- **AC-1:** User can switch interface language between English, Russian, and French, translating all UI text immediately.
- **AC-2:** Uploading a clear photo of a Hebrew Arnona bill returns a translation and correctly parses the deadline, amount, and payment link in <15 seconds.
- **AC-3:** Processing a document successfully deducts exactly 1 credit from the user's database balance.
- **AC-4:** If document processing fails due to server or external API error, the credit is not deducted (transaction is rolled back).
- **AC-5:** A user with 0 credits is prevented from scanning documents or generating PDFs, and is shown a "Buy Credits" button.
- **AC-6:** Chat messages deduct 1 credit for every 5 messages sent to the assistant. Partial message counts carry over across sessions.
- **AC-7:** User profile fields (Passport, Address, ID) are saved in browser storage (local-first) and are never submitted to or saved in the central server database.
- **AC-8:** Form pre-filling maps profile fields to correct Hebrew form fields and downloads the file as a standard PDF entirely client-side.
- **AC-9:** Dashboard lists 5 default Aliyah tasks (HMO signup, bank account, Arnona, driving license, Sal Klita) upon first registration. Each task explicitly lists its required chronological subtasks (e.g., Driver's License task must list "Get Eye Check", "Fill out Green Form", "Visit Misrad Harishuy").
- **AC-10:** Payment of $29 updates the user's credit balance by +50 credits within <5 seconds of checkout completion.
- **AC-11:** Payment of $9.99 updates the user's credit balance by +20 credits within <5 seconds of checkout completion.
- **AC-12:** Blurry or non-Hebrew file uploads return a helpful error message and do not deduct any credits.
- **AC-13:** Every page displays the user's current credit balance in the header.
- **AC-14:** Upgrades are triggered via a secure payment checkout link (LemonSqueezy/Polar).
- **AC-15:** Closing the browser and returning retains the user's local profile fields and task list status.
- **AC-16:** Ephemeral processing ensures uploaded images/files are completely deleted from the server filesystem/memory within 60 seconds of processing.
- **AC-17:** Users can manually edit any parsed OCR details (amount, deadline) on their dashboard if the LLM makes a parsing mistake.
- **AC-18:** Default chat routing uses Gemini 1.5 Flash, costing <$0.001 per message.
- **AC-19:** Split-screen PDF preview component updates form fields in real-time as user changes input on the right side.
- **AC-20:** Sending an image of a Hebrew letter to the designated WhatsApp/Telegram bot phone number returns a parsed summary text block and deducts 1 credit.
- **AC-21:** The office guide displays the closest physical office locations based on geolocation coordinates or selected city.

---

## Out of Scope
- Direct API submissions or automated write actions inside myGov (Gov.il) or municipal websites.
- Native mobile applications (v1 is web-only with WhatsApp/Telegram integrations).
- Professional legal representation or live human chat support.
- Processing files larger than 10MB.
- Support for Hebrew text input from the user (conversations must be in English, Russian, or French).
- Archiving raw uploaded document files on the server (deleted ephemerally).

---

## Open Questions
- [x] How will we handle municipal forms since each city in Israel has different forms? (RESOLVED: v1 will support Tel Aviv and Jerusalem municipal forms as default, and general national forms like driver's license and Bituach Leumi. Others will fallback to interactive text-guided wizards).
