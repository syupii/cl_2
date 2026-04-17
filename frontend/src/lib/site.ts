/**
 * Absolute origin used by server-rendered SEO metadata (sitemap, robots,
 * canonical URLs). Set NEXT_PUBLIC_SITE_URL in Vercel / production env;
 * the fallback is only used during local development.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

export const SITE_NAME = 'サブスク管理ダッシュボード'
