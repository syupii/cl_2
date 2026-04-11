# 📋 サブスクリプション一元管理ダッシュボード 要件定義書

## 1. プロジェクト概要
ユーザーが契約しているサブスクリプション（月額・年額サービス）を一元管理し、実質的な月間負担額の算出、多通貨の日本円換算、および支出推移の可視化を行うWebアプリケーション。
フロントエンドとバックエンドを完全に分離したモダンなAPIアーキテクチャを採用する。

## 2. システム構成・技術スタック

### フロントエンド
* **フレームワーク:** Next.js (App Router) + TypeScript
* **UI/スタイリング:** Tailwind CSS, shadcn/ui, Recharts (グラフ描画)
* **API通信・状態管理:** TanStack Query (React Query)
* **型生成:** OpenAPI仕様書から自動生成 (`openapi-typescript` 等)

### バックエンド
* **言語/ルーター:** Go (Golang) + `chi` (または `Gin`)
* **DB操作:** `sqlc` (型安全なSQLクエリ生成)
* **API仕様書生成:** `swaggo/swag` (OpenAPI/Swagger)

### データベース・インフラ
* **DB・認証:** Supabase (PostgreSQL, Supabase Auth)
* **セキュリティ:** PostgreSQLのRLS (Row Level Security) を有効化し、ユーザー自身のデータのみアクセス可能にする。

---

## 3. 機能要件 (Functional Requirements)

### A. 認証機能
* Supabase Authを用いたサインアップ、ログイン、ログアウト。
* フロントエンドは取得したJWTをバックエンドAPIの `Authorization: Bearer <JWT>` ヘッダーに付与してリクエストする。

### B. サブスクリプション管理機能 (CRUD)
* **ステータス管理:** 物理削除(DELETE)は行わず、`status` を `active` (有効) または `cancelled` (解約済み) で管理する。
* **決済手段の記録:** どのクレジットカードや口座で支払っているかをメタデータとして記録する。

### C. 高度な計算・自動化機能 (Goバックエンドで処理)
* **年額の月額換算:** 年払い設定のサービスは、ダッシュボード表示時に「月額負担額（年額÷12）」として算出する。
* **多通貨対応:** USDなどの外貨で登録された場合、バックエンドで固定レート（例: 1USD = 150JPY）または外部APIを用いて日本円に換算し、合計金額を算出する。

### D. テンプレート機能（サジェスト）
* 新規登録時、有名サービス（Netflix, YouTube Premium等）のテンプレートを選択できる。
* テンプレートを選択すると、サービス名、アイコン画像、プラン一覧、標準価格が自動入力される。

### E. ダッシュボード機能 (UI/分析)
* 今月の合計支払い金額（実質負担額）のハイライト表示。
* カテゴリ別の支出割合（円グラフ）。
* 月別の支出推移（棒グラフ）。

---

## 4. データベース設計 (PostgreSQL Schema)

以下のテーブルをSupabase上に作成し、すべてに適切なRLSポリシーを設定すること。

### 1. `service_templates` (マスターデータ: 有名サービス一覧)
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | テンプレートID |
| `name` | VARCHAR | Not Null, Unique | サービス名 (例: Netflix) |
| `icon_url` | VARCHAR | Nullable | ロゴ画像のURL |

### 2. `service_plans` (マスターデータ: サービスに紐づくプラン)
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | プランID |
| `template_id` | UUID | Foreign Key | `service_templates.id` への参照 |
| `plan_name` | VARCHAR | Not Null | プラン名 (例: Premium) |
| `default_price` | NUMERIC | Not Null | 標準価格 |
| `billing_cycle` | VARCHAR | Not Null | `monthly` または `yearly` |
| `currency` | VARCHAR | Not Null | 通貨 (例: JPY, USD) |

### 3. `user_subscriptions` (ユーザーの個別データ)
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | レコードID |
| `user_id` | UUID | Not Null | Supabase AuthのユーザーID |
| `service_name` | VARCHAR | Not Null | サービス名（テンプレート外の自由入力も可） |
| `plan_name` | VARCHAR | Nullable | プラン名 |
| `price` | NUMERIC | Not Null | 料金 |
| `currency` | VARCHAR | Default 'JPY' | 通貨 (JPY, USD等) |
| `billing_cycle` | VARCHAR | Not Null | `monthly` または `yearly` |
| `next_billing_date`| DATE | Not Null | 次回の支払い日 |
| `category` | VARCHAR | Nullable | カテゴリ |
| `payment_method` | VARCHAR | Nullable | 決済手段 |
| `status` | VARCHAR | Default 'active'| `active` または `cancelled` |
| `created_at` | TIMESTAMPTZ| Default NOW() | 作成日時 |
| `updated_at` | TIMESTAMPTZ| Default NOW() | 更新日時 |

---

## 5. バックエンド API定義 (Go)

すべてのエンドポイントは `/api/v1` 配下に配置し、Supabase JWTによる認証ミドルウェアを通すこと。

* **`GET /subscriptions`**: ユーザーのサブスク一覧を取得。
* **`POST /subscriptions`**: 新規サブスクの登録。
* **`PUT /subscriptions/:id`**: 特定のサブスク情報の更新（解約ステータスへの変更含む）。
* **`GET /templates`**: 登録画面用のサービス・プランテンプレート一覧を取得。
* **`GET /summary`**: ダッシュボード表示用の集計データ（月間合計、カテゴリ別合計等、年額換算・為替換算済みの値）を返す。

---

## 6. 開発フローの制約 (Data Flow Strict Rules)

1. **DB設計が先:** 必ず `schema.sql` (テーブル定義・RLS) と `query.sql` (CRUD・集計クエリ) を書き、`sqlc generate` でGoのコードを生成すること。
2. **仕様書の自動生成:** GoのAPIハンドラを実装したらSwaggerコメントを書き、`swag init` で `swagger.json` を出力すること。
3. **フロントの型安全:** 出力された `swagger.json` からTypeScriptの型を生成し、TanStack Queryを使ってAPI通信を実装すること。
