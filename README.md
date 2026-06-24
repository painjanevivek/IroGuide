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

Use a base64-encoded service account JSON when your host makes multiline
secrets awkward:

```powershell
FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64=<base64 encoded service account JSON>
```

Or use a single JSON secret:

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

### Security rules emulator tests

The Firestore and Storage rules have emulator-backed ownership tests for saved
reviews, active drafts, and private source images at
`users/{uid}/reviews/{reviewId}/source.*`.

```powershell
npm run test:rules
```

The command starts local Firestore and Storage emulators with the checked-in
rules and runs `src/firebase-security.rules.test.ts` against the demo project
`demo-iroguide-rules`. Install JDK 21 or newer and keep Java available on
`PATH` before running the Firebase emulators locally.

### Prelaunch security smoke

Run the deployed route/header/API gate smoke against production or a preview:

```powershell
$env:DAST_BASE_URL="https://iroguide.com"; npm run dast:prelaunch
```

The script writes a JSON report to `artifacts/dast-prelaunch-report.json` and
checks public security headers, protected API auth gates, cross-site blocking,
unsupported media rejection, API no-store headers, and sensitive response leaks.
`npm run smoke:security` is kept as an alias. See `docs/prelaunch-dast.md` for
the staging runbook and CI example.

Run the production smoke before launch or after CDN/Firebase rule changes:

```powershell
$env:SMOKE_BASE_URL="https://iroguide.com"; npm run smoke:production
```

In addition to route and readiness checks, the production smoke verifies that the
deployed preview preserves the security headers from `next.config.ts` and that
live Firebase rules deny cross-user reads for saved reviews and private source
images. It uses the same Firebase web key and Admin credential environment
variables described above. Set `SMOKE_SECURITY_HEADERS=false` or
`SMOKE_FIREBASE_RULES=false` only when intentionally narrowing a diagnostic run.

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
npm run test:e2e
npm run test:rules
npm run dast:prelaunch
npm run build
```

Run the core project gate with:

```powershell
npm run check
```

## End-to-end smoke

Install the Chromium browser once before the first Playwright run:

```powershell
npm run test:e2e:install
```

By default, `npm run test:e2e` starts the app with `NEXT_PUBLIC_E2E_LOCAL_AUTH=true`.
That local fallback signs in through the manual email UI, mocks only the review
creation API, and verifies that the dashboard recognizes a saved critique with a
private source image. It is meant for laptops and CI jobs that should not depend
on a live Firebase project.

To exercise the Firebase-backed path instead, provide a dedicated email/password
test account plus the normal Firebase web and admin environment variables:

```powershell
$env:E2E_AUTH_MODE="firebase"
$env:E2E_EMAIL="iroguide-e2e@example.com"
$env:E2E_PASSWORD="your-test-password"
npm run test:e2e
```

Firebase mode uses the real manual sign-in flow, the real `/api/reviews` route,
and account storage. Use a disposable Firebase test account because the smoke
saves a critique to that account.
