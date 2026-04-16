-- =============================================================================
-- Migration: add trial_end_date to user_subscriptions
-- =============================================================================
-- Run this once in Supabase (SQL Editor) against existing databases.
-- schema.sql is the source of truth for fresh deployments; this file brings
-- already-deployed databases in sync.

ALTER TABLE public.user_subscriptions
    ADD COLUMN IF NOT EXISTS trial_end_date DATE;

COMMENT ON COLUMN public.user_subscriptions.trial_end_date
    IS 'Optional free-trial end date. NULL for regular paid subscriptions.';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_end_date
    ON public.user_subscriptions (user_id, trial_end_date)
    WHERE trial_end_date IS NOT NULL;
