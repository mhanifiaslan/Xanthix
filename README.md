# Xanthix.ai

AI agent powered grant & project proposal writing platform. Generates full
proposals (TÜBİTAK, EU, IPA, Horizon Europe, Teknofest, KOSGEB and custom)
from a single user idea, using a workflow defined per project type by the
admin team.

> Status: pre-MVP. Sprint 0 — foundation in place.

## Tech stack

- **Next.js 16** (App Router, React 19, RSC + Server Actions)
- **Tailwind v4**
- **Firebase**: Auth, Firestore, Storage, Cloud Functions, App Check
- **Genkit** for AI orchestration (multi-model: Gemini, Claude, GPT)
- **Stripe** for global payments + token credits
- **next-intl** for tr / en / es UI

> ⚠️ This is the bundled-docs Next.js. Always read
> `node_modules/next/dist/docs/` before writing code — APIs differ from
> training data (e.g. `middleware.ts` is now `proxy.ts`, `params` is a
> `Promise`).

## Local setup

### 1. Prerequisites

- Node.js **20+**
- A Firebase project (already created: `xanthixai`)
- Firebase CLI: `npm i -g firebase-tools`

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Then fill in the values. See the **Firebase Console checklist** below.

### 4. Firebase login + project link

```bash
firebase login
firebase use xanthixai
```

### 5. Run

```bash
# Next.js dev server
npm run dev

# Firebase emulators (auth + firestore + storage) in another terminal
npm run firebase:emu
```

App: http://localhost:3000  · Emulator UI: http://localhost:4000

## Firebase Console checklist (one-time)

1. **Authentication** → Sign-in method → enable:
   - Email/Password
   - Google
   - (later) Apple, GitHub
2. **Firestore Database** → Create database
   - Mode: **Production**
   - Location: **eur3 (multi-region, Europe)** for GDPR/KVKK compliance
3. **Storage** → Create bucket
   - Same region: **eur3**
4. **App Check** → register web app with **reCAPTCHA Enterprise**
   - Save the site key into `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`
5. **Project Settings → Your apps → Web app** → register a new web app
   - Copy the config into the `NEXT_PUBLIC_FIREBASE_*` vars in `.env.local`
6. **Project Settings → Service accounts** → Generate new private key
   - Save JSON locally (e.g. `./.secrets/firebase-adminsdk.json`,
     gitignored). Set `FIREBASE_SERVICE_ACCOUNT_PATH` to that path **only
     for local dev**. In production we'll use Application Default
     Credentials.
7. **Billing** → upgrade to **Blaze (pay as you go)**. Required for Cloud
   Functions and Genkit. Set a budget alert.

## Deploy rules + indexes

After editing `firestore.rules`, `firestore.indexes.json`, or
`storage.rules`:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

## Repository

GitHub: https://github.com/mhanifiaslan/Xanthix

## Roadmap

See the architecture plan in the project Notes / chat history. Current
focus: **Sprint 0 — foundation**, then Sprint 1 (auth + i18n shell).
