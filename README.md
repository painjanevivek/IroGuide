# IroGuide

Standalone Next.js website and browser-side product experience for IroGuide.
The API lives in the separate
[IroGuide-backend](https://github.com/painjanevivek/IroGuide-backend) repository.

```powershell
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and expects the backend defined by
`NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

## Firebase setup

1. Copy `.env.example` to `.env.local` and fill the Firebase web app values.
2. Keep Google and Email/Password sign-in enabled in Firebase Authentication.
3. Add every deployed frontend domain to Firebase Authentication authorized
   domains before testing sign-in.
4. Publish the rules in `firestore.rules` to allow signed-in users to read only
   their own backend-created reviews.

The browser signs in with Firebase, sends the ID token to the backend, and reads
review history from Firestore.

## Architecture notes

- `src/domain` holds framework-independent schemas, plan rules, and progress
  calculations so the UI can stay thin and the core behavior remains easy to
  test.
- Firebase client code is isolated under `src/lib/firebase`; backend-trusted
  Firebase Admin and OpenRouter credentials stay in the separate backend repo.
- Authentication supports Google plus manual email/password fallback. The CSP in
  `next.config.ts` intentionally allows only the Firebase and Google endpoints
  required by those flows.

## Quality checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
