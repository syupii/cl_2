-- =============================================================================
-- Subscription Dashboard - SQL Queries (consumed by sqlc)
-- =============================================================================
-- All queries are executed through the backend API, which authenticates the
-- caller via Supabase JWT and then runs SQL with the user's own Postgres role
-- so that Row-Level Security (schema.sql) is applied automatically.
--
-- Naming convention:
--   :one      -> exactly one row
--   :many     -> a slice of rows
--   :exec     -> no result set
-- =============================================================================


-- =============================================================================
-- service_templates / service_plans (read-only master data)
-- =============================================================================

-- name: ListServiceTemplates :many
-- Returns all well-known service templates, ordered by name.
SELECT
    id,
    name,
    icon_url,
    created_at
FROM public.service_templates
ORDER BY name ASC;

-- name: ListServicePlansByTemplate :many
-- Returns every plan attached to a given template, cheapest first.
SELECT
    id,
    template_id,
    plan_name,
    default_price,
    billing_cycle,
    currency,
    created_at
FROM public.service_plans
WHERE template_id = $1
ORDER BY default_price ASC;

-- name: ListAllServicePlans :many
-- Returns every plan across all templates. Used by the API /templates endpoint
-- to build the nested template -> plans response in a single round trip.
SELECT
    id,
    template_id,
    plan_name,
    default_price,
    billing_cycle,
    currency,
    created_at
FROM public.service_plans
ORDER BY template_id ASC, default_price ASC;


-- =============================================================================
-- user_subscriptions : CRUD for the authenticated user
-- =============================================================================

-- name: ListUserSubscriptions :many
-- All subscriptions belonging to the given user, regardless of status.
-- The explicit user_id filter is defense-in-depth; RLS already enforces it.
SELECT
    id,
    user_id,
    service_name,
    plan_name,
    price,
    currency,
    billing_cycle,
    next_billing_date,
    category,
    payment_method,
    status,
    created_at,
    updated_at
FROM public.user_subscriptions
WHERE user_id = $1
ORDER BY status ASC, next_billing_date ASC;

-- name: ListActiveUserSubscriptions :many
-- Only the subscriptions currently charging the user. Used by GET /summary.
SELECT
    id,
    user_id,
    service_name,
    plan_name,
    price,
    currency,
    billing_cycle,
    next_billing_date,
    category,
    payment_method,
    status,
    created_at,
    updated_at
FROM public.user_subscriptions
WHERE user_id = $1
  AND status = 'active'
ORDER BY next_billing_date ASC;

-- name: GetUserSubscription :one
-- Fetch one subscription by its primary key, scoped to the caller.
SELECT
    id,
    user_id,
    service_name,
    plan_name,
    price,
    currency,
    billing_cycle,
    next_billing_date,
    category,
    payment_method,
    status,
    created_at,
    updated_at
FROM public.user_subscriptions
WHERE id = $1
  AND user_id = $2;

-- name: CreateUserSubscription :one
-- Insert a new subscription. user_id is always set from the JWT claim, never
-- from the request body, so the INSERT policy's WITH CHECK passes.
INSERT INTO public.user_subscriptions (
    user_id,
    service_name,
    plan_name,
    price,
    currency,
    billing_cycle,
    next_billing_date,
    category,
    payment_method,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'active')
)
RETURNING
    id,
    user_id,
    service_name,
    plan_name,
    price,
    currency,
    billing_cycle,
    next_billing_date,
    category,
    payment_method,
    status,
    created_at,
    updated_at;

-- name: UpdateUserSubscription :one
-- Full update (PUT /subscriptions/:id). Callers must send the complete object.
-- status can be flipped between 'active' and 'cancelled' here (soft-delete).
UPDATE public.user_subscriptions
SET
    service_name      = $3,
    plan_name         = $4,
    price             = $5,
    currency          = $6,
    billing_cycle     = $7,
    next_billing_date = $8,
    category          = $9,
    payment_method    = $10,
    status            = $11
WHERE id = $1
  AND user_id = $2
RETURNING
    id,
    user_id,
    service_name,
    plan_name,
    price,
    currency,
    billing_cycle,
    next_billing_date,
    category,
    payment_method,
    status,
    created_at,
    updated_at;

-- name: CancelUserSubscription :one
-- Convenience mutation for the "cancel" action in the UI. Equivalent to
-- UpdateUserSubscription with status='cancelled', but cheaper for the client.
UPDATE public.user_subscriptions
SET status = 'cancelled'
WHERE id = $1
  AND user_id = $2
RETURNING
    id,
    user_id,
    service_name,
    plan_name,
    price,
    currency,
    billing_cycle,
    next_billing_date,
    category,
    payment_method,
    status,
    created_at,
    updated_at;


-- =============================================================================
-- Aggregations for GET /summary
-- =============================================================================
-- NOTE: Currency conversion (USD->JPY) and yearly->monthly normalisation live
-- in Go, not in SQL. The queries below return per-row raw values in the
-- currency the user entered. The handler normalises and sums them.

-- name: SumActiveSubscriptionsByCategory :many
-- Category-level breakdown for the pie chart. We keep rows split by currency
-- and billing_cycle so the Go layer can apply the correct conversion factor.
SELECT
    COALESCE(category, 'Uncategorized') AS category,
    currency,
    billing_cycle,
    SUM(price)::NUMERIC(14, 2) AS total_price,
    COUNT(*)::BIGINT           AS subscription_count
FROM public.user_subscriptions
WHERE user_id = $1
  AND status = 'active'
GROUP BY category, currency, billing_cycle
ORDER BY category ASC;

-- name: SumActiveSubscriptionsByMonth :many
-- Returns the raw charges that fall inside each of the most recent N months,
-- grouped by the billing month. This powers the monthly trend bar chart.
-- $1 = user_id, $2 = number of months to look back (inclusive of current).
SELECT
    date_trunc('month', next_billing_date)::DATE AS billing_month,
    currency,
    billing_cycle,
    SUM(price)::NUMERIC(14, 2) AS total_price,
    COUNT(*)::BIGINT           AS subscription_count
FROM public.user_subscriptions
WHERE user_id = $1
  AND status = 'active'
  AND next_billing_date >= (date_trunc('month', CURRENT_DATE) - (($2::INT - 1) || ' months')::INTERVAL)
GROUP BY billing_month, currency, billing_cycle
ORDER BY billing_month ASC;
