-- =============================================================================
-- Subscription Dashboard - Database Schema
-- =============================================================================
-- Target: Supabase (PostgreSQL 15+)
--
-- This file is the single source of truth for tables, constraints, indexes,
-- and Row-Level Security (RLS) policies used by the Go backend (via sqlc)
-- and by Supabase Auth.
--
-- Conventions:
--   * Primary keys are UUID, generated with gen_random_uuid() (pgcrypto).
--   * Timestamps use TIMESTAMPTZ and default to NOW().
--   * All user-scoped tables enable RLS so users can only touch their own rows.
--   * Master tables (service_templates, service_plans) are readable by any
--     authenticated user but writable only with the service_role key.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. service_templates : master list of well-known subscription services.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.service_templates (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL UNIQUE,
    icon_url    VARCHAR(1024),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.service_templates            IS 'Master list of popular subscription services (Netflix, Spotify, ...).';
COMMENT ON COLUMN public.service_templates.name       IS 'Human-readable service name. Unique.';
COMMENT ON COLUMN public.service_templates.icon_url   IS 'Publicly accessible logo image URL.';

-- =============================================================================
-- 2. service_plans : plans attached to a template (Basic/Standard/Premium...).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.service_plans (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id    UUID        NOT NULL REFERENCES public.service_templates(id) ON DELETE CASCADE,
    plan_name      VARCHAR(255) NOT NULL,
    default_price  NUMERIC(12, 2) NOT NULL CHECK (default_price >= 0),
    billing_cycle  VARCHAR(16)  NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'once')),
    currency       VARCHAR(8)   NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (template_id, plan_name, billing_cycle)
);

CREATE INDEX IF NOT EXISTS idx_service_plans_template_id
    ON public.service_plans (template_id);

COMMENT ON TABLE  public.service_plans               IS 'Plans (tiers) belonging to a service_template row.';
COMMENT ON COLUMN public.service_plans.billing_cycle IS 'Either "monthly", "yearly", or "once" (one-time expense).';
COMMENT ON COLUMN public.service_plans.currency      IS 'ISO 4217 3-letter currency code (JPY, USD, ...).';

-- =============================================================================
-- 3. user_subscriptions : the subscriptions each user is actually paying for.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name      VARCHAR(255) NOT NULL,
    plan_name         VARCHAR(255),
    price             NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    currency          VARCHAR(8)   NOT NULL DEFAULT 'JPY' CHECK (currency ~ '^[A-Z]{3}$'),
    billing_cycle     VARCHAR(16)  NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'once')),
    next_billing_date DATE         NOT NULL,
    category          VARCHAR(64),
    payment_method    VARCHAR(128),
    status            VARCHAR(16)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
    ON public.user_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status
    ON public.user_subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing_date
    ON public.user_subscriptions (next_billing_date);

COMMENT ON TABLE  public.user_subscriptions                    IS 'Individual subscriptions owned by a Supabase auth user.';
COMMENT ON COLUMN public.user_subscriptions.user_id            IS 'Owner (Supabase auth.users.id). RLS restricts access to this user.';
COMMENT ON COLUMN public.user_subscriptions.status             IS 'Soft-deletion flag. "active" or "cancelled". We never DELETE rows.';
COMMENT ON COLUMN public.user_subscriptions.billing_cycle      IS 'Either "monthly", "yearly", or "once". yearly values are divided by 12 in summary; once values contribute 0 to monthly totals.';
COMMENT ON COLUMN public.user_subscriptions.next_billing_date  IS 'Next scheduled charge date.';

-- Trigger: keep updated_at in sync on row update ------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- service_templates : authenticated users may read, nobody may write via RLS.
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_templates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_templates_select_authenticated
    ON public.service_templates;
CREATE POLICY service_templates_select_authenticated
    ON public.service_templates
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- service_plans : same read-only policy for authenticated users.
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_plans FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_plans_select_authenticated
    ON public.service_plans;
CREATE POLICY service_plans_select_authenticated
    ON public.service_plans
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- user_subscriptions : users can only touch rows they own.
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_subscriptions_select_own
    ON public.user_subscriptions;
CREATE POLICY user_subscriptions_select_own
    ON public.user_subscriptions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_subscriptions_insert_own
    ON public.user_subscriptions;
CREATE POLICY user_subscriptions_insert_own
    ON public.user_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_subscriptions_update_own
    ON public.user_subscriptions;
CREATE POLICY user_subscriptions_update_own
    ON public.user_subscriptions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- NOTE: We deliberately do NOT define a DELETE policy.
-- REQUIREMENTS.md section 3.B mandates soft-deletion via status='cancelled',
-- so there is no legitimate path for a user to hard-delete a subscription row.
