# DermaAI — Skin Health & Lesion Risk Assessment Platform

DermaAI is a full-stack healthcare technology platform built to help individuals document skin lesions, understand ABCDE warning signs, and decide when to seek professional dermatological care.

> **Important Medical Notice:** DermaAI is **not** a certified medical diagnostic device. An AI assessment cannot diagnose or exclude skin cancer. Never delay professional dermatological evaluation based on an AI output or demonstration result.

---

## Architecture Overview

DermaAI cleanly separates **clinical image classification** from **educational language communication**:

1. **Replaceable Dermatology Classification Layer (`src/server/dermatologyModel.ts`)**
   - Uses a typed `DermatologyClassificationProvider` interface.
   - Defaults safely to `DemonstrationDermatologyProvider`, displaying:
     `"AI image assessment is currently in demonstration mode. No medical classification is available."`
   - Never generates fabricated predictions, fake confidence percentages, or simulated cancer results.
   - Includes `ExternalValidatedModelAdapter` to plug in a clinically validated dermatology inference endpoint via environment variables without modifying frontend code.
   - Enforces uncertainty/out-of-distribution rejection gates and tracks sensitivity, specificity, and Fitzpatrick skin tone I–VI evaluation metrics.

2. **Gemini Educational & Communication Layer (`src/server/geminiService.ts`)**
   - Calls `@google/genai` (`gemini-4-hydrogen`) strictly from the Node.js server.
   - Generates plain-language terminology explanations, clinical limitation notices, dermatologist visit questions, and educational Q&A chat.
   - Never receives user PII (names, emails, or account IDs) and is explicitly constrained from diagnosing lesions.

3. **Security, Privacy & Firebase Governance**
   - Salted `crypto.scryptSync` password hashing + HMAC-SHA256 `HttpOnly` session cookies.
   - Google Sign-In via Firebase Auth (`signInWithPopup`) verified server-side with `firebase-admin/auth`.
   - Binary image validation (JPEG/PNG magic-byte checks, IHDR/SOF dimension parsing, 10 MB cap, embedded script/executable scanning).
   - Explicit privacy consent before upload, configurable image retention (0–365 days), and instant image/record deletion.
   - Hardened `firestore.rules` audited with `@firebase/eslint-plugin-security-rules`.

---

## Project Structure

```text
├── server.ts                       # Express + Vite / static production server (port 3000)
├── firebase-blueprint.json         # Firestore entity & collection blueprint IR
├── firestore.rules                 # Hardened RBAC & PII-isolated Firestore security rules
├── eslint.config.mjs               # ESLint config with @firebase/eslint-plugin-security-rules
├── src/
│   ├── shared/types.ts             # Shared frontend/backend TypeScript contracts
│   ├── server/
│   │   ├── auth.ts                 # scrypt hashing, HMAC sessions, Firebase Admin verification, RBAC
│   │   ├── store.ts                # Atomic persistence & audit log store
│   │   ├── imageValidation.ts      # Binary format, dimension & malware/polyglot validation
│   │   ├── dermatologyModel.ts     # Replaceable classification interface & symptom triage
│   │   ├── geminiService.ts        # Server-side @google/genai educational integration
│   │   └── routes.ts               # REST API endpoints (/api/*)
│   ├── context/                    # AuthContext & ThemeContext (Light/Dark)
│   ├── lib/                        # API client, Firebase SDK setup, jsPDF report generator
│   ├── components/                 # Navbar, Footer, DermatologistFinderModal, SkinHealthChatDrawer
│   └── pages/                      # Home, Assessment (4-step), ABCDE Guide, About, Contact, Auth, Dashboard, Admin
└── tests/
    └── dermaai.test.ts             # Automated Vitest suite
```

---

## REST API Endpoints

- `POST /api/auth/register` — Create patient account with hashed password
- `POST /api/auth/login` — Sign in with email/password
- `POST /api/auth/google` — Verify Firebase Google ID token & create session
- `POST /api/auth/logout` — Clear session cookie
- `GET /api/auth/me` — Retrieve active session user
- `POST /api/assessment/upload` — Consent-gated multipart image upload & binary validation
- `POST /api/assessment/analyze` — Run replaceable dermatology model + symptom triage + Gemini education
- `GET /api/assessment/history` — List authenticated user's informational assessment records
- `GET /api/assessment/:id` — Retrieve single assessment record (owner-only)
- `GET /api/assessment/:id/image` — Retrieve stored image (owner-only)
- `DELETE /api/assessment/:id/image` — Permanently delete uploaded image
- `DELETE /api/assessment/:id` — Permanently delete assessment & image
- `GET /api/user/profile` / `PUT /api/user/profile` — Manage profile & image retention policy
- `GET /api/admin/dashboard` — RBAC admin overview (excludes patient images & lesion notes)
- `POST /api/chat` — Educational Gemini skin health Q&A
- `POST /api/contact` — Contact & feedback submission

---

## Installation & Running

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (see `.env.example`):
   - `GEMINI_API_KEY`: Server-side Gemini API key
   - `SESSION_SECRET`: Strong random HMAC secret for session cookies
   - Optional external validated classifier: `DERMATOLOGY_MODEL_ENDPOINT`, `DERMATOLOGY_MODEL_API_KEY`, `DERMATOLOGY_MODEL_VALIDATED="true"`
3. Run development server on port `3000`:
   ```bash
   npm run dev
   ```
4. Run automated tests, TypeScript check, and production build:
   ```bash
   npm test
   npm run lint
   npm run build
   npm start
   ```
