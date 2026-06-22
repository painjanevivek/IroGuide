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
2. Keep Google sign-in enabled in Firebase Authentication.
3. Publish the rules in `firestore.rules` to allow signed-in users to read only
   their own backend-created reviews.

The browser signs in with Firebase, sends the ID token to the backend, and reads
review history from Firestore.

## Quality checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
