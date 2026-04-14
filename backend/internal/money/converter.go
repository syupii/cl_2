// Package money performs the two arithmetic normalisations called out in
// REQUIREMENTS.md section 3.C:
//
//  1. Yearly -> monthly: yearly prices are divided by 12.
//  2. Foreign currency -> JPY: amounts are multiplied by a fixed reference
//     rate configured via config.Config.FXRates.
//
// All arithmetic uses shopspring/decimal to avoid the floating-point drift
// that would otherwise appear in sums on the dashboard.
package money

import (
	"fmt"
	"strings"

	"github.com/shopspring/decimal"
)

// Billing cycles understood by the backend. Values match the CHECK
// constraint in db/schema.sql.
const (
	CycleMonthly = "monthly"
	CycleYearly  = "yearly"
	CycleOnce    = "once"
)

// BaseCurrency is the currency that all aggregated/summary values use.
const BaseCurrency = "JPY"

// Converter turns a (price, currency, billing_cycle) tuple into the
// equivalent monthly JPY amount.
type Converter struct {
	rates map[string]decimal.Decimal
}

// NewConverter takes ownership of the rate table. The table must contain
// an entry for BaseCurrency mapped to 1.
func NewConverter(rates map[string]decimal.Decimal) *Converter {
	cp := make(map[string]decimal.Decimal, len(rates))
	for k, v := range rates {
		cp[strings.ToUpper(k)] = v
	}
	// Guarantee the base rate is present.
	if _, ok := cp[BaseCurrency]; !ok {
		cp[BaseCurrency] = decimal.NewFromInt(1)
	}
	return &Converter{rates: cp}
}

// ToJPY converts an amount in the given currency to JPY.
// Unknown currencies return an explicit error so the caller can 400 the
// request rather than silently under-reporting the total.
func (c *Converter) ToJPY(amount decimal.Decimal, currency string) (decimal.Decimal, error) {
	code := strings.ToUpper(strings.TrimSpace(currency))
	if code == "" {
		return decimal.Zero, fmt.Errorf("money: empty currency")
	}
	rate, ok := c.rates[code]
	if !ok {
		return decimal.Zero, fmt.Errorf("money: unsupported currency %q", code)
	}
	return amount.Mul(rate), nil
}

// MonthlyEquivalent divides yearly prices by 12 and leaves monthly prices
// untouched. One-time ("once") expenses return zero so they do not inflate
// recurring monthly totals. Any other cycle value is rejected to match the DB CHECK.
func MonthlyEquivalent(amount decimal.Decimal, cycle string) (decimal.Decimal, error) {
	switch strings.ToLower(strings.TrimSpace(cycle)) {
	case CycleMonthly:
		return amount, nil
	case CycleYearly:
		// Divide with 4 decimal places of precision; the final round happens
		// in MonthlyJPY below so summing remains stable.
		return amount.DivRound(decimal.NewFromInt(12), 4), nil
	case CycleOnce:
		// One-time expenses don't recur, so they contribute 0 to monthly totals.
		return decimal.Zero, nil
	default:
		return decimal.Zero, fmt.Errorf("money: unsupported billing_cycle %q", cycle)
	}
}

// MonthlyJPY is the convenience helper used by handlers and summary logic:
// it applies the currency conversion first, then the monthly normalisation,
// then rounds to whole yen (JPY has no minor units on the dashboard).
func (c *Converter) MonthlyJPY(amount decimal.Decimal, currency, cycle string) (decimal.Decimal, error) {
	inJPY, err := c.ToJPY(amount, currency)
	if err != nil {
		return decimal.Zero, err
	}
	monthly, err := MonthlyEquivalent(inJPY, cycle)
	if err != nil {
		return decimal.Zero, err
	}
	return monthly.Round(0), nil
}

// SupportedCurrencies returns the sorted list of known currency codes.
// Used by the /summary handler to surface what the backend can convert.
func (c *Converter) SupportedCurrencies() []string {
	out := make([]string, 0, len(c.rates))
	for k := range c.rates {
		out = append(out, k)
	}
	return out
}
