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

## Quality checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
