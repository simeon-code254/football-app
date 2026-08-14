const SUPABASE_ORIGIN = 'https://qefovzbhnmdhbqldtptc.supabase.co';

// Internal admin tool -- no reason it should ever be framed, and no third
// -party embeds/analytics of any kind, so CSP can stay tight without the
// usual tracking-script/ad-network exceptions a consumer site needs.
//
// script-src needs 'unsafe-eval' in dev only -- Next's dev server (Fast
// Refresh / webpack HMR) evaluates chunks via eval() internally. Without it,
// every client-side JS execution after a Server Action call (approve/reject
// scout, resolve report, etc.) threw a CSP EvalError and died before the
// toast/router.refresh() that would show the result ever ran -- the mutation
// itself could still succeed server-side while the UI silently never
// reflected it. The production build doesn't use eval, so prod stays strict.
const scriptSrc =
  process.env.NODE_ENV === 'development'
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // 'unsafe-inline' here (not a nonce-based policy) because Next's App
      // Router emits its own inline hydration/RSC-streaming <script> tags;
      // a strict nonce policy needs per-request middleware wiring that
      // isn't worth it for an internal tool -- this still blocks any
      // externally-hosted script/style injection, which is the actual risk.
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: ${SUPABASE_ORIGIN}`,
      // Video review player (Videos detail page) streams signed URLs from
      // the same Supabase Storage origin.
      `media-src 'self' ${SUPABASE_ORIGIN}`,
      `connect-src 'self' ${SUPABASE_ORIGIN}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
