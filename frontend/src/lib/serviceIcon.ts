// サービス名 → ドメイン推定 → Google Favicon URL
// 既知のサービスは DOMAIN_MAP で正確にマッピングし、未知のサービスは
// サービス名が URL ライクならそのまま、そうでなければ null を返して
// <ServiceIcon> コンポーネント側でイニシャル表示にフォールバックさせる。

const DOMAIN_MAP: Record<string, string> = {
  // 動画・音楽
  Netflix: 'netflix.com',
  Spotify: 'spotify.com',
  YouTube: 'youtube.com',
  'YouTube Premium': 'youtube.com',
  'YouTube Music': 'youtube.com',
  'Amazon Prime': 'amazon.co.jp',
  'Amazon Prime Video': 'amazon.co.jp',
  'Disney+': 'disneyplus.com',
  Hulu: 'hulu.jp',
  'Apple Music': 'apple.com',
  'Apple TV+': 'apple.com',
  'U-NEXT': 'unext.jp',
  ABEMA: 'abema.tv',
  DAZN: 'dazn.com',
  dTV: 'video.dmkt-sp.jp',
  WOWOW: 'wowow.co.jp',
  // ソフトウェア・開発
  Adobe: 'adobe.com',
  'Adobe Creative Cloud': 'adobe.com',
  GitHub: 'github.com',
  'GitHub Copilot': 'github.com',
  GitLab: 'gitlab.com',
  Figma: 'figma.com',
  Notion: 'notion.so',
  Slack: 'slack.com',
  Dropbox: 'dropbox.com',
  'Microsoft 365': 'microsoft.com',
  'Office 365': 'microsoft.com',
  'Google Workspace': 'google.com',
  'Google One': 'google.com',
  iCloud: 'apple.com',
  'iCloud+': 'apple.com',
  'JetBrains': 'jetbrains.com',
  // AI
  ChatGPT: 'openai.com',
  OpenAI: 'openai.com',
  Claude: 'claude.ai',
  Anthropic: 'anthropic.com',
  Gemini: 'google.com',
  Midjourney: 'midjourney.com',
  // その他
  Kindle: 'amazon.co.jp',
  'Kindle Unlimited': 'amazon.co.jp',
  LINE: 'line.me',
  'LINE MUSIC': 'line.me',
  Evernote: 'evernote.com',
  '1Password': '1password.com',
  Bitwarden: 'bitwarden.com',
  NordVPN: 'nordvpn.com',
  ExpressVPN: 'expressvpn.com',
  Canva: 'canva.com',
}

function googleFavicon(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
}

export function guessIconUrl(serviceName: string | undefined | null, size = 64): string | null {
  if (!serviceName) return null
  const trimmed = serviceName.trim()
  if (!trimmed) return null

  // 1) 完全一致
  const exact = DOMAIN_MAP[trimmed]
  if (exact) return googleFavicon(exact, size)

  // 2) 部分一致（最長マッチ優先。例: "Adobe Photoshop" → "Adobe"）
  const lower = trimmed.toLowerCase()
  const hit = Object.entries(DOMAIN_MAP)
    .filter(([k]) => lower.includes(k.toLowerCase()))
    .sort(([a], [b]) => b.length - a.length)[0]
  if (hit) return googleFavicon(hit[1], size)

  // 3) URL-like な名前: "example.com" をそのままドメインとして扱う
  if (/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}(\.[a-z]{2,})?$/i.test(trimmed)) {
    return googleFavicon(trimmed.toLowerCase(), size)
  }

  return null
}
