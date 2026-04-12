// Package seed upserts the master service_templates and service_plans rows on
// every startup so that plan prices are always kept in sync with the values
// defined here. Edit this file whenever a service changes its pricing.
//
// UPSERT strategy:
//   - service_templates : ON CONFLICT (name) DO UPDATE icon_url
//   - service_plans     : ON CONFLICT (template_id, plan_name, billing_cycle) DO UPDATE default_price, currency
package seed

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// plan describes one pricing tier for a service.
type plan struct {
	Name     string
	Price    string // NUMERIC-safe string, e.g. "1490"
	Currency string // ISO 4217
	Cycle    string // "monthly" or "yearly"
}

// service groups a template with its plans.
type service struct {
	Name    string
	IconURL string
	Plans   []plan
}

// catalog is the authoritative list of services and their current prices.
// Update prices here and redeploy to propagate changes to the database.
var catalog = []service{
	{
		Name:    "Netflix",
		IconURL: "https://www.google.com/s2/favicons?domain=netflix.com&sz=128",
		Plans: []plan{
			{Name: "広告つきスタンダード", Price: "790", Currency: "JPY", Cycle: "monthly"},
			{Name: "スタンダード", Price: "1490", Currency: "JPY", Cycle: "monthly"},
			{Name: "プレミアム", Price: "1980", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "Spotify",
		IconURL: "https://www.google.com/s2/favicons?domain=spotify.com&sz=128",
		Plans: []plan{
			{Name: "プレミアム（個人）", Price: "980", Currency: "JPY", Cycle: "monthly"},
			{Name: "プレミアム（デュオ）", Price: "1280", Currency: "JPY", Cycle: "monthly"},
			{Name: "プレミアム（ファミリー）", Price: "1580", Currency: "JPY", Cycle: "monthly"},
			{Name: "プレミアム（学生）", Price: "480", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "Amazon Prime",
		IconURL: "https://www.google.com/s2/favicons?domain=amazon.co.jp&sz=128",
		Plans: []plan{
			{Name: "月払い", Price: "600", Currency: "JPY", Cycle: "monthly"},
			{Name: "年払い", Price: "5900", Currency: "JPY", Cycle: "yearly"},
		},
	},
	{
		Name:    "YouTube Premium",
		IconURL: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128",
		Plans: []plan{
			{Name: "個人 月払い", Price: "1280", Currency: "JPY", Cycle: "monthly"},
			{Name: "個人 年払い", Price: "12800", Currency: "JPY", Cycle: "yearly"},
			{Name: "ファミリー 月払い", Price: "2280", Currency: "JPY", Cycle: "monthly"},
			{Name: "ファミリー 年払い", Price: "22800", Currency: "JPY", Cycle: "yearly"},
		},
	},
	{
		Name:    "Disney+",
		IconURL: "https://www.google.com/s2/favicons?domain=disneyplus.com&sz=128",
		Plans: []plan{
			{Name: "スタンダード 月払い", Price: "990", Currency: "JPY", Cycle: "monthly"},
			{Name: "スタンダード 年払い", Price: "9900", Currency: "JPY", Cycle: "yearly"},
			{Name: "プレミアム 月払い", Price: "1320", Currency: "JPY", Cycle: "monthly"},
			{Name: "プレミアム 年払い", Price: "13200", Currency: "JPY", Cycle: "yearly"},
		},
	},
	{
		Name:    "Apple Music",
		IconURL: "https://www.google.com/s2/favicons?domain=music.apple.com&sz=128",
		Plans: []plan{
			{Name: "個人", Price: "1080", Currency: "JPY", Cycle: "monthly"},
			{Name: "ファミリー", Price: "1680", Currency: "JPY", Cycle: "monthly"},
			{Name: "学生", Price: "580", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "Apple TV+",
		IconURL: "https://www.google.com/s2/favicons?domain=tv.apple.com&sz=128",
		Plans: []plan{
			{Name: "月払い", Price: "900", Currency: "JPY", Cycle: "monthly"},
			{Name: "年払い", Price: "9000", Currency: "JPY", Cycle: "yearly"},
		},
	},
	{
		Name:    "iCloud+",
		IconURL: "https://www.google.com/s2/favicons?domain=icloud.com&sz=128",
		Plans: []plan{
			{Name: "50GB", Price: "130", Currency: "JPY", Cycle: "monthly"},
			{Name: "200GB", Price: "400", Currency: "JPY", Cycle: "monthly"},
			{Name: "2TB", Price: "1300", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "Microsoft 365",
		IconURL: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128",
		Plans: []plan{
			{Name: "パーソナル 月払い", Price: "1490", Currency: "JPY", Cycle: "monthly"},
			{Name: "パーソナル 年払い", Price: "14900", Currency: "JPY", Cycle: "yearly"},
			{Name: "ファミリー 月払い", Price: "2100", Currency: "JPY", Cycle: "monthly"},
			{Name: "ファミリー 年払い", Price: "21000", Currency: "JPY", Cycle: "yearly"},
		},
	},
	{
		Name:    "Hulu",
		IconURL: "https://www.google.com/s2/favicons?domain=hulu.com&sz=128",
		Plans: []plan{
			{Name: "月払い", Price: "1026", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "U-NEXT",
		IconURL: "https://www.google.com/s2/favicons?domain=video.unext.jp&sz=128",
		Plans: []plan{
			{Name: "月払い", Price: "2189", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "dアニメストア",
		IconURL: "https://www.google.com/s2/favicons?domain=animestore.docomo.ne.jp&sz=128",
		Plans: []plan{
			{Name: "月払い", Price: "550", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "Adobe Creative Cloud",
		IconURL: "https://www.google.com/s2/favicons?domain=adobe.com&sz=128",
		Plans: []plan{
			{Name: "コンプリートプラン 月払い", Price: "7780", Currency: "JPY", Cycle: "monthly"},
			{Name: "コンプリートプラン 年払い", Price: "72336", Currency: "JPY", Cycle: "yearly"},
			{Name: "フォトプラン", Price: "2380", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "Notion",
		IconURL: "https://www.google.com/s2/favicons?domain=notion.so&sz=128",
		Plans: []plan{
			{Name: "Plus", Price: "10", Currency: "USD", Cycle: "monthly"},
			{Name: "Business", Price: "15", Currency: "USD", Cycle: "monthly"},
		},
	},
	{
		Name:    "Dropbox",
		IconURL: "https://www.google.com/s2/favicons?domain=dropbox.com&sz=128",
		Plans: []plan{
			{Name: "Plus 月払い", Price: "1440", Currency: "JPY", Cycle: "monthly"},
			{Name: "Plus 年払い", Price: "14400", Currency: "JPY", Cycle: "yearly"},
			{Name: "Professional 月払い", Price: "2400", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "GitHub",
		IconURL: "https://www.google.com/s2/favicons?domain=github.com&sz=128",
		Plans: []plan{
			{Name: "Pro", Price: "4", Currency: "USD", Cycle: "monthly"},
			{Name: "Team", Price: "4", Currency: "USD", Cycle: "monthly"},
		},
	},
	{
		Name:    "ChatGPT",
		IconURL: "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128",
		Plans: []plan{
			{Name: "Plus", Price: "20", Currency: "USD", Cycle: "monthly"},
			{Name: "Pro", Price: "200", Currency: "USD", Cycle: "monthly"},
		},
	},
	{
		Name:    "Claude",
		IconURL: "https://www.google.com/s2/favicons?domain=claude.ai&sz=128",
		Plans: []plan{
			{Name: "Pro", Price: "20", Currency: "USD", Cycle: "monthly"},
			{Name: "Max", Price: "100", Currency: "USD", Cycle: "monthly"},
		},
	},
	{
		Name:    "NHKプラス",
		IconURL: "https://www.google.com/s2/favicons?domain=nhk.jp&sz=128",
		Plans: []plan{
			{Name: "月払い", Price: "1320", Currency: "JPY", Cycle: "monthly"},
		},
	},
	{
		Name:    "AbemaTV",
		IconURL: "https://www.google.com/s2/favicons?domain=abema.tv&sz=128",
		Plans: []plan{
			{Name: "プレミアム 月払い", Price: "960", Currency: "JPY", Cycle: "monthly"},
			{Name: "プレミアム 年払い", Price: "9600", Currency: "JPY", Cycle: "yearly"},
		},
	},
}

// Run upserts all catalog entries into the database.
// It is safe to call multiple times (idempotent).
func Run(ctx context.Context, pool *pgxpool.Pool) error {
	log.Println("seed: upserting service templates and plans...")

	for _, svc := range catalog {
		// UPSERT the template and get its ID back.
		var templateID string
		err := pool.QueryRow(ctx, `
			INSERT INTO public.service_templates (name, icon_url)
			VALUES ($1, $2)
			ON CONFLICT (name) DO UPDATE
			  SET icon_url = EXCLUDED.icon_url
			RETURNING id
		`, svc.Name, svc.IconURL).Scan(&templateID)
		if err != nil {
			return fmt.Errorf("seed: upsert template %q: %w", svc.Name, err)
		}

		// UPSERT each plan for this template.
		for _, p := range svc.Plans {
			_, err := pool.Exec(ctx, `
				INSERT INTO public.service_plans (template_id, plan_name, default_price, billing_cycle, currency)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (template_id, plan_name, billing_cycle) DO UPDATE
				  SET default_price = EXCLUDED.default_price,
				      currency      = EXCLUDED.currency
			`, templateID, p.Name, p.Price, p.Cycle, p.Currency)
			if err != nil {
				return fmt.Errorf("seed: upsert plan %q/%q: %w", svc.Name, p.Name, err)
			}
		}
	}

	log.Printf("seed: done (%d services)", len(catalog))
	return nil
}
