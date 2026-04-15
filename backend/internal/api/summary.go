package api

import (
	"net/http"
	"sort"
	"time"

	"github.com/shopspring/decimal"

	"github.com/syupii/cl_2/backend/internal/auth"
	"github.com/syupii/cl_2/backend/internal/httpx"
	"github.com/syupii/cl_2/backend/internal/money"
	"github.com/syupii/cl_2/backend/internal/repository"
)

// monthlyTrendWindow is how many recent months (including the current one)
// are returned by GET /summary. Six months lets the bar chart show a
// half-year trend without overwhelming mobile viewports.
const monthlyTrendWindow = 6

// GetSummary godoc
//
// @Summary      Dashboard summary with JPY totals and charts data
// @Description  Returns the effective monthly spend in JPY, a breakdown by
// @Description  category for the pie chart, and a monthly trend for the
// @Description  bar chart. All computations happen in Go with the fixed
// @Description  FX rates configured on the backend.
// @Tags         summary
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  httpx.Response{data=api.SummaryResponse}
// @Failure      401  {object}  httpx.Response
// @Failure      500  {object}  httpx.Response
// @Router       /summary [get]
func (h *Handler) GetSummary(w http.ResponseWriter, r *http.Request) {
	userID := auth.MustUserID(r.Context())

	active, err := h.repo.ListActiveUserSubscriptions(r.Context(), userID)
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	resp, err := buildSummary(active, h.conv, time.Now().UTC())
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	httpx.OK(w, http.StatusOK, resp)
}

// buildSummary is factored out to keep the handler thin and to make the
// aggregation logic unit-testable without a DB.
func buildSummary(
	active []repository.UserSubscription,
	conv *money.Converter,
	now time.Time,
) (SummaryResponse, error) {
	total := decimal.Zero
	onceTotal := decimal.Zero
	subscriptionCount := 0
	byCategory := make(map[string]*CategoryBreakdown)

	// Build the list of trend months (oldest first).
	//
	// NOTE: The trend is derived from the *currently active* rows and walks
	// back through each month using CreatedAt. Cancelled subscriptions
	// therefore drop out of historical months as well — the chart reflects
	// "how today's lineup evolved" rather than "what you actually paid back
	// then". Reconstructing the latter would require a cancelled_at column
	// on user_subscriptions so we can test month-membership over time.
	trendMonths := lastNMonths(now, monthlyTrendWindow)
	trendTotals := make(map[string]decimal.Decimal, len(trendMonths))
	for _, m := range trendMonths {
		trendTotals[m] = decimal.Zero
	}

	for _, s := range active {
		isExpenseItem := s.PlanName.Valid && s.PlanName.String == "__expense__"
		isOnce := s.BillingCycle == money.CycleOnce

		// 「一回払い (once)」は *課金サイクル* を主軸に月次集計から完全に外す。
		// MonthlyJPY は once に対して 0 を返すので total は壊れないが、
		//   - カテゴリ集計には 0 円の行が残り categoryCount を狂わせる
		//   - トレンドにも 0 を足すだけの無意味なイテレーションが走る
		// ため、ここで明示的に分岐する。
		//   * expense-once      : OnceTotalJPY に満額を積み上げて別フィールドで返す
		//     （一回払いは月次按分せず、年額換算でも ×12 しない）
		//   * subscription-once : 現状のフロント UI は作らせないが、防衛的に無視
		if isOnce {
			if isExpenseItem {
				fullJPY, err := conv.ToJPY(s.Price, s.Currency)
				if err != nil {
					return SummaryResponse{}, err
				}
				onceTotal = onceTotal.Add(fullJPY.Round(0))
			}
			continue
		}

		// 再発性の支出（expense かつ monthly/yearly）は支出タブ側で管理し、
		// サブスクの total/category/trend には含めない。
		if isExpenseItem {
			continue
		}

		// ここに来るのは「純粋なサブスク (monthly/yearly)」のみ。
		subscriptionCount++

		monthlyJPY, err := conv.MonthlyJPY(s.Price, s.Currency, s.BillingCycle)
		if err != nil {
			return SummaryResponse{}, err
		}

		total = total.Add(monthlyJPY)

		// Category breakdown.
		category := "Uncategorized"
		if s.Category.Valid && s.Category.String != "" {
			category = s.Category.String
		}
		if entry, ok := byCategory[category]; ok {
			entry.AmountJPY = addString(entry.AmountJPY, monthlyJPY)
			entry.Count++
		} else {
			byCategory[category] = &CategoryBreakdown{
				Category:  category,
				AmountJPY: monthlyJPY.StringFixed(0),
				Count:     1,
			}
		}

		// Monthly trend: the subscription contributes to every trend month
		// whose end is on or after its created_at date. This gives a stable
		// picture of "what were you paying per month" even though the schema
		// doesn't store start-of-contract dates.
		for _, m := range trendMonths {
			monthEnd := endOfMonth(m)
			if !s.CreatedAt.After(monthEnd) {
				trendTotals[m] = trendTotals[m].Add(monthlyJPY)
			}
		}
	}

	// Flatten and sort the category map for stable output.
	categoryOut := make([]CategoryBreakdown, 0, len(byCategory))
	for _, v := range byCategory {
		categoryOut = append(categoryOut, *v)
	}
	sort.Slice(categoryOut, func(i, j int) bool {
		return categoryOut[i].Category < categoryOut[j].Category
	})

	trendOut := make([]MonthlyTrendPoint, 0, len(trendMonths))
	for _, m := range trendMonths {
		trendOut = append(trendOut, MonthlyTrendPoint{
			Month:     m,
			AmountJPY: trendTotals[m].StringFixed(0),
		})
	}

	return SummaryResponse{
		TotalMonthlyJPY: total.StringFixed(0),
		OnceTotalJPY:    onceTotal.StringFixed(0),
		Currency:        money.BaseCurrency,
		// ActiveCount は「アクティブな純粋サブスク」の件数。expense-* や
		// once は除外済みなので、UI の「有効サブスク数」カードとズレない。
		ActiveCount:       subscriptionCount,
		CategoryBreakdown: categoryOut,
		MonthlyTrend:      trendOut,
	}, nil
}

// addString parses the current "amount_jpy" string back to a decimal, adds
// delta, and returns the new fixed-point string. Used to fold additional
// rows into an existing CategoryBreakdown.
func addString(prev string, delta decimal.Decimal) string {
	current, err := decimal.NewFromString(prev)
	if err != nil {
		current = decimal.Zero
	}
	return current.Add(delta).StringFixed(0)
}

// lastNMonths returns the YYYY-MM labels for the last n months, oldest first.
func lastNMonths(now time.Time, n int) []string {
	now = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	out := make([]string, 0, n)
	for i := n - 1; i >= 0; i-- {
		m := now.AddDate(0, -i, 0)
		out = append(out, m.Format("2006-01"))
	}
	return out
}

// endOfMonth parses a "YYYY-MM" label and returns the last instant of that
// month. Used to decide whether a subscription contributed to a trend bar.
func endOfMonth(month string) time.Time {
	t, err := time.Parse("2006-01", month)
	if err != nil {
		return time.Time{}
	}
	firstOfNext := time.Date(t.Year(), t.Month()+1, 1, 0, 0, 0, 0, time.UTC)
	return firstOfNext.Add(-time.Nanosecond)
}
