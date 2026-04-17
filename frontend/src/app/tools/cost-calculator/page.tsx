import type { Metadata } from 'next'
import Link from 'next/link'
import { Calculator } from './Calculator'
import { SITE_NAME, SITE_URL } from '@/lib/site'

const PAGE_PATH = '/tools/cost-calculator'
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`

const PAGE_TITLE = 'サブスク月額換算ツール｜外貨・年払いを円の月額に一括変換'
const PAGE_DESCRIPTION =
  '外貨や年払いのサブスクリプションを日本円の月額・年額・5年累計に自動換算するツール。USD / EUR / GBP 対応。登録不要でそのまま計算できます。'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    siteName: SITE_NAME,
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
}

const FAQ = [
  {
    q: '年払いのサブスクを月額に換算する計算式は？',
    a: '年額 ÷ 12 で月額に換算できます。例えば年額 18,000 円なら月額 1,500 円です。当ツールでは通貨が異なる場合でも円換算後に ÷12 して表示します。',
  },
  {
    q: '外貨建てサブスクの為替レートはいつ時点のものですか？',
    a: '当ツールは JPY=1, USD=150, EUR=162, GBP=190 円の参考固定レートで計算しています。実際のカード請求額はカード会社レートと為替変動で前後します。',
  },
  {
    q: '計算結果は保存されますか？',
    a: 'ブラウザ内で計算しているのみで、外部サーバーには何も送信しません。保存やログインは不要です。',
  },
]

// JSON-LD for rich results (FAQPage + SoftwareApplication).
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'サブスク月額換算ツール',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: PAGE_URL,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'JPY' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools/` },
        { '@type': 'ListItem', position: 3, name: 'サブスク月額換算ツール', item: PAGE_URL },
      ],
    },
  ],
}

export default function CostCalculatorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="パンくず" className="mb-6 text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span className="mx-1">/</span>
        <span>Tools</span>
        <span className="mx-1">/</span>
        <span className="text-foreground">サブスク月額換算ツール</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">
          サブスク月額換算ツール
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          外貨や年払いのサブスクリプションを、日本円の月額・年額・累計コストに
          自動で換算します。登録・ログインは不要です。
        </p>
      </header>

      <Calculator />

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-bold">このツールでできること</h2>
        <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
          <li>USD / EUR / GBP 建てサブスクを円ベースで比較</li>
          <li>年払いプランの月額換算と、年払いで節約できる金額の把握</li>
          <li>2 年・5 年・10 年で支払うことになる累計コストの試算</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-bold">よくある質問</h2>
        <dl className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="rounded-lg border p-4">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 rounded-2xl border bg-muted/40 p-6">
        <h2 className="text-xl font-bold">複数サブスクをまとめて管理したい方へ</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          契約中のサブスクを一覧で管理し、合計月額や解約忘れのアラートを
          ダッシュボードで確認できます。
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          無料で使ってみる
        </Link>
      </section>
    </main>
  )
}
