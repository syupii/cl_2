import type { NextConfig } from "next";

// Build-time env vars for CSP connect-src.
// Falls back to permissive wildcards so local dev still works without them.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "*.supabase.co";

const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// Content-Security-Policy directives.
// Trade-off: 'unsafe-inline' in script-src is required because Next.js App
// Router inlines a small bootstrap script. The remaining directives still
// meaningfully restrict XSS impact (tight connect-src limits data
// exfiltration, frame-ancestors blocks clickjacking).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} ${apiOrigin}`,
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Strict-Transport-Security (HSTS) はリバースプロキシ・CDN 側で設定する。
  // アプリ側で設定すると HTTP 環境（localhost 等）でリロード不可になるため除外。
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
