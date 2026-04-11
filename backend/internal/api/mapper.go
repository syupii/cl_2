package api

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shopspring/decimal"

	"github.com/syupii/cl_2/backend/internal/money"
	"github.com/syupii/cl_2/backend/internal/repository"
)

// dateLayout is the JSON wire format for dates without a time component.
const dateLayout = "2006-01-02"

// toSubscriptionDTO converts the sqlc-generated row into the wire DTO,
// attaching the computed JPY monthly cost.
func toSubscriptionDTO(row repository.UserSubscription, conv *money.Converter) (SubscriptionDTO, error) {
	monthlyJPY, err := conv.MonthlyJPY(row.Price, row.Currency, row.BillingCycle)
	if err != nil {
		return SubscriptionDTO{}, err
	}

	return SubscriptionDTO{
		ID:              row.ID.String(),
		ServiceName:     row.ServiceName,
		PlanName:        pgTextPtr(row.PlanName),
		Price:           row.Price.String(),
		Currency:        row.Currency,
		BillingCycle:    row.BillingCycle,
		NextBillingDate: row.NextBillingDate.Format(dateLayout),
		Category:        pgTextPtr(row.Category),
		PaymentMethod:   pgTextPtr(row.PaymentMethod),
		Notes:           pgTextPtr(row.Notes),
		Status:          row.Status,
		CreatedAt:       row.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:       row.UpdatedAt.UTC().Format(time.RFC3339),
		MonthlyCostJPY:  monthlyJPY.StringFixed(0),
	}, nil
}

// toSubscriptionDTOs converts a slice, short-circuiting on the first error.
func toSubscriptionDTOs(rows []repository.UserSubscription, conv *money.Converter) ([]SubscriptionDTO, error) {
	out := make([]SubscriptionDTO, 0, len(rows))
	for _, row := range rows {
		dto, err := toSubscriptionDTO(row, conv)
		if err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	return out, nil
}

// toTemplateDTOs zips service_templates with their plans (already grouped by
// template_id) into the nested shape the frontend register modal needs.
func toTemplateDTOs(
	templates []repository.ServiceTemplate,
	plansByTemplate map[string][]repository.ServicePlan,
) []TemplateDTO {
	out := make([]TemplateDTO, 0, len(templates))
	for _, tpl := range templates {
		tplID := tpl.ID.String()
		planRows := plansByTemplate[tplID]
		plans := make([]PlanDTO, 0, len(planRows))
		for _, p := range planRows {
			plans = append(plans, PlanDTO{
				ID:           p.ID.String(),
				PlanName:     p.PlanName,
				DefaultPrice: p.DefaultPrice.StringFixed(2),
				BillingCycle: p.BillingCycle,
				Currency:     p.Currency,
			})
		}
		out = append(out, TemplateDTO{
			ID:      tplID,
			Name:    tpl.Name,
			IconURL: pgTextPtr(tpl.IconUrl),
			Plans:   plans,
		})
	}
	return out
}

// pgTextPtr converts pgtype.Text into *string. A null value maps to nil.
func pgTextPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	s := t.String
	return &s
}

// pgTextFromPtr is the inverse used by Create/Update handlers.
func pgTextFromPtr(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

// parseDate validates and parses a YYYY-MM-DD string.
func parseDate(s string) (time.Time, error) {
	return time.Parse(dateLayout, s)
}

// parsePrice validates a decimal price string.
func parsePrice(s string) (decimal.Decimal, error) {
	return decimal.NewFromString(s)
}
