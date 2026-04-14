package api

import (
	"errors"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"

	"github.com/syupii/cl_2/backend/internal/money"
)

// validatedSubscription is the result of validating Create/Update request
// bodies. Fields are already typed so handlers can pass them to sqlc params
// directly.
type validatedSubscription struct {
	ServiceName     string
	Price           decimal.Decimal
	Currency        string
	BillingCycle    string
	NextBillingDate string // re-used as time.Time via parseDate in the handler
	Status          string // only populated by Update; empty for Create
}

// validateCommon validates the fields shared by Create and Update requests.
func validateCommon(
	serviceName, priceStr, currency, billingCycle, nextBillingDate string,
	conv *money.Converter,
) (validatedSubscription, error) {
	var v validatedSubscription

	v.ServiceName = strings.TrimSpace(serviceName)
	if v.ServiceName == "" {
		return v, errors.New("service_name is required")
	}
	if len(v.ServiceName) > 255 {
		return v, errors.New("service_name must be at most 255 characters")
	}

	price, err := decimal.NewFromString(priceStr)
	if err != nil {
		return v, fmt.Errorf("price must be a decimal string: %w", err)
	}
	if price.IsNegative() {
		return v, errors.New("price must be zero or positive")
	}
	v.Price = price

	v.Currency = strings.ToUpper(strings.TrimSpace(currency))
	if _, err := conv.ToJPY(decimal.NewFromInt(1), v.Currency); err != nil {
		return v, err
	}

	v.BillingCycle = strings.ToLower(strings.TrimSpace(billingCycle))
	switch v.BillingCycle {
	case money.CycleMonthly, money.CycleYearly, money.CycleOnce:
	default:
		return v, fmt.Errorf("billing_cycle must be %q, %q, or %q", money.CycleMonthly, money.CycleYearly, money.CycleOnce)
	}

	if strings.TrimSpace(nextBillingDate) == "" {
		return v, errors.New("next_billing_date is required")
	}
	if _, err := parseDate(nextBillingDate); err != nil {
		return v, errors.New("next_billing_date must be YYYY-MM-DD")
	}
	v.NextBillingDate = nextBillingDate

	return v, nil
}

// validateStatus ensures Update's status field is one of the two allowed values.
func validateStatus(status string) (string, error) {
	s := strings.ToLower(strings.TrimSpace(status))
	switch s {
	case "active", "cancelled":
		return s, nil
	default:
		return "", errors.New(`status must be "active" or "cancelled"`)
	}
}
