import type { NextConfig } from "next";

// Content-Security-Policy directives.
// connect-src は 'self' + https: + wss: を許可。
// default-src が 'self' のままだと connect-src のフォールバックとして
// 外部APIリクエストをすべてブロックするため明示的に設定が必要。
// バックエンドURLは環境によって変わるため https: で全HTTPS接続を許可し、
// 接続先の認可はJWT認証とCORSに委ねる。
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self' https: wss:",
  "img-src 'self' data: blob: https:",
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
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // iOS Safari aggressively caches the service worker script itself,
        // which can leave users stuck on a broken old SW. Forcing revalidation
        // guarantees they pick up fixes to /sw.js on the very next visit.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
