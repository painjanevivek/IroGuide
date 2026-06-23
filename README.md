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
4. Publish the rules in `firestore.rules` so signed-in users can save their own
   reviews, drafts, and selected community interactions.

```powershell
npx firebase-tools deploy --only firestore:rules --project <firebase-project-id>
```

The browser signs in with Firebase, sends the ID token to the review API, and
reads review history from Firestore.

## Live vision setup

Local demo mode is used until production vision credentials are configured.
To enable live pixel analysis, set these deployment environment variables:

```powershell
IROGUIDE_REVIEW_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=qwen/qwen3.5-vl
OPENROUTER_SITE_URL=https://iroguide.com
OPENROUTER_APP_NAME=IroGuide
```

Do not commit `OPENROUTER_API_KEY`. Add it through your hosting provider's
secret/environment settings, then redeploy. Successful live reviews show the
`Live vision critique` banner instead of `Local demo mode`.

## Architecture notes

- `src/domain` holds framework-independent schemas, plan rules, and progress
  calculations so the UI can stay thin and the core behavior remains easy to
  test.
- Firebase client code is isolated under `src/lib/firebase`; OpenRouter
  credentials are read only from server-side environment variables.
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
