# IroGuide

Standalone Next.js website, product experience, and authenticated review API for IroGuide.

```powershell
npm install
npm run dev
```

The app runs on `http://localhost:3000`. `NEXT_PUBLIC_API_URL` can point to a
separate compatible API, otherwise the built-in Next.js API routes are used.

## Firebase setup

1. Copy `.env.example` to `.env.local` and fill the Firebase web app values.
2. Keep Google and Email/Password sign-in enabled in Firebase Authentication.
3. Add every deployed frontend domain to Firebase Authentication authorized
   domains before testing sign-in.
4. Add Firebase Admin credentials to the server environment so API routes can
   verify ID tokens and persist completed reviews from a trusted context.
5. Publish the rules in `firestore.rules` so signed-in users can read their own
   account data and use draft/community interactions.

Use either a single JSON secret:

```powershell
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON={"project_id":"...","client_email":"...","private_key":"..."}
```

Or split values:

```powershell
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

```powershell
npx firebase-tools deploy --only firestore:rules --project <firebase-project-id>
```

The browser signs in with Firebase and sends the ID token to the review API.
The API verifies the token server-side before saving completed reviews.

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
- Firebase client code is isolated under `src/lib/firebase`; Firebase Admin and
  OpenRouter credentials are read only from server-side environment variables.
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
