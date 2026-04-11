// Package api contains the HTTP layer: DTOs, handlers, and the chi router.
//
// The DTOs defined in this file form the public contract between the Go
// backend and the Next.js frontend. They are documented with swaggo tags so
// swag init can emit an OpenAPI spec that openapi-typescript consumes on the
// frontend side.
//
// Design notes:
//   - decimal.Decimal values are serialised as strings to preserve precision
//     when the frontend rounds/formats them.
//   - Nullable DB columns (plan_name, category, payment_method) are exposed
//     as pointer fields so they JSON-encode as either a string or null.
//   - Dates (next_billing_date, trend month) are exposed as plain strings in
//     YYYY-MM-DD / YYYY-MM format; the frontend parses them with Date.
package api

// SubscriptionDTO is the wire shape of a single row from user_subscriptions,
// augmented with the normalised monthly JPY cost computed by money.Converter.
type SubscriptionDTO struct {
	ID              string  `json:"id"                 example:"3d49e7a3-4a2a-4b8e-9f3b-6f3b0d8e9c1a"`
	ServiceName     string  `json:"service_name"       example:"Netflix"`
	PlanName        *string `json:"plan_name"          example:"Premium"`
	Price           string  `json:"price"              example:"2290"`
	Currency        string  `json:"currency"           example:"JPY"`
	BillingCycle    string  `json:"billing_cycle"      example:"monthly" enums:"monthly,yearly"`
	NextBillingDate string  `json:"next_billing_date"  example:"2026-05-01"`
	Category        *string `json:"category"           example:"Entertainment"`
	PaymentMethod   *string `json:"payment_method"     example:"Visa ****1234"`
	Notes           *string `json:"notes"              example:"家族プラン"`
	Status          string  `json:"status"             example:"active" enums:"active,cancelled"`
	CreatedAt       string  `json:"created_at"         example:"2026-04-01T10:00:00Z"`
	UpdatedAt       string  `json:"updated_at"         example:"2026-04-01T10:00:00Z"`

	// MonthlyCostJPY is the effective monthly burden after converting to JPY
	// and dividing yearly prices by 12. Frontend can sum these safely.
	MonthlyCostJPY string `json:"monthly_cost_jpy" example:"2290"`
}

// ListSubscriptionsResponse wraps the subscription slice. Having a named
// envelope makes swag generics (httpx.Response{data=api.ListSubscriptionsResponse})
// read naturally.
type ListSubscriptionsResponse struct {
	Subscriptions []SubscriptionDTO `json:"subscriptions"`
}

// CreateSubscriptionRequest is the POST /subscriptions body.
type CreateSubscriptionRequest struct {
	ServiceName     string  `json:"service_name"       example:"Netflix"`
	PlanName        *string `json:"plan_name"          example:"Premium"`
	Price           string  `json:"price"              example:"2290"`
	Currency        string  `json:"currency"           example:"JPY"`
	BillingCycle    string  `json:"billing_cycle"      example:"monthly" enums:"monthly,yearly"`
	NextBillingDate string  `json:"next_billing_date"  example:"2026-05-01"`
	Category        *string `json:"category"           example:"Entertainment"`
	PaymentMethod   *string `json:"payment_method"     example:"Visa ****1234"`
	Notes           *string `json:"notes"              example:"家族プラン"`
}

// UpdateSubscriptionRequest is the PUT /subscriptions/{id} body.
// All fields are required because the endpoint is a full replace; to cancel,
// send the existing fields with Status set to "cancelled".
type UpdateSubscriptionRequest struct {
	ServiceName     string  `json:"service_name"       example:"Netflix"`
	PlanName        *string `json:"plan_name"          example:"Premium"`
	Price           string  `json:"price"              example:"2290"`
	Currency        string  `json:"currency"           example:"JPY"`
	BillingCycle    string  `json:"billing_cycle"      example:"monthly" enums:"monthly,yearly"`
	NextBillingDate string  `json:"next_billing_date"  example:"2026-05-01"`
	Category        *string `json:"category"           example:"Entertainment"`
	PaymentMethod   *string `json:"payment_method"     example:"Visa ****1234"`
	Notes           *string `json:"notes"              example:"家族プラン"`
	Status          string  `json:"status"             example:"active" enums:"active,cancelled"`
}

// PlanDTO is a plan row from service_plans ready to feed the register modal.
type PlanDTO struct {
	ID           string `json:"id"            example:"5f0b34c0-0ccd-4b9b-9b29-77a6c61b0123"`
	PlanName     string `json:"plan_name"     example:"Premium"`
	DefaultPrice string `json:"default_price" example:"2290"`
	BillingCycle string `json:"billing_cycle" example:"monthly" enums:"monthly,yearly"`
	Currency     string `json:"currency"      example:"JPY"`
}

// TemplateDTO is a service_template row with its plans nested inside.
type TemplateDTO struct {
	ID      string    `json:"id"       example:"26c8c2b0-4e6c-42c5-9a55-cfb0d4f6eb44"`
	Name    string    `json:"name"     example:"Netflix"`
	IconURL *string   `json:"icon_url" example:"https://example.com/netflix.png"`
	Plans   []PlanDTO `json:"plans"`
}

// ListTemplatesResponse is the GET /templates payload.
type ListTemplatesResponse struct {
	Templates []TemplateDTO `json:"templates"`
}

// CategoryBreakdown is a single slice of the pie chart on the dashboard.
type CategoryBreakdown struct {
	Category  string `json:"category"   example:"Entertainment"`
	AmountJPY string `json:"amount_jpy" example:"5290"`
	Count     int    `json:"count"      example:"3"`
}

// MonthlyTrendPoint is one bar of the monthly spend bar chart.
type MonthlyTrendPoint struct {
	Month     string `json:"month"      example:"2026-04"`
	AmountJPY string `json:"amount_jpy" example:"7680"`
}

// SummaryResponse is the aggregated dashboard payload returned by GET /summary.
type SummaryResponse struct {
	TotalMonthlyJPY   string              `json:"total_monthly_jpy"   example:"7680"`
	Currency          string              `json:"currency"            example:"JPY"`
	ActiveCount       int                 `json:"active_count"        example:"5"`
	CategoryBreakdown []CategoryBreakdown `json:"category_breakdown"`
	MonthlyTrend      []MonthlyTrendPoint `json:"monthly_trend"`
}

// HealthResponse is the payload for the public /healthz endpoint.
type HealthResponse struct {
	Status string `json:"status" example:"ok"`
}
