const SCRIPT_SOURCES = [
  "https://apis.google.com",
  "https://accounts.google.com",
  "https://www.google.com",
  "https://www.gstatic.com",
  "https://www.googletagmanager.com",
  "https://*.gstatic.com",
  "https://*.firebaseapp.com",
  "https://*.web.app",
] as const;

const CONNECT_SOURCES = [
  "https://*.vercel.app",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://firestore.googleapis.com",
  "https://firebasestorage.googleapis.com",
  "https://*.googleapis.com",
  "https://*.firebaseio.com",
  "https://*.firebaseapp.com",
  "https://*.web.app",
  "https://accounts.google.com",
  "https://apis.google.com",
  "https://www.google.com",
  "https://www.gstatic.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://region1.google-analytics.com",
] as const;

const FRAME_SOURCES = [
  "https://accounts.google.com",
  "https://apis.google.com",
  "https://www.google.com",
  "https://recaptcha.google.com",
  "https://*.firebaseapp.com",
  "https://*.web.app",
] as const;

const FORM_ACTIONS = [
  "https://accounts.google.com",
  "https://*.firebaseapp.com",
  "https://*.web.app",
] as const;

export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""} ${SCRIPT_SOURCES.join(" ")}`,
    "script-src-attr 'none'",
    `style-src 'self' ${isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // Framer Motion, GSAP, and React write dynamic style attributes. Limit the
    // exception to attributes instead of allowing arbitrary inline style blocks.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data: https://lh3.googleusercontent.com https://www.google-analytics.com https://*.google-analytics.com",
    "font-src 'self'",
    `connect-src 'self'${isDevelopment ? " http://localhost:* ws://localhost:*" : ""} ${CONNECT_SOURCES.join(" ")}`,
    `frame-src 'self' ${FRAME_SOURCES.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${FORM_ACTIONS.join(" ")}`,
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}
