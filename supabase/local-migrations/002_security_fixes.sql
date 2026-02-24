-- Migration: Security fixes from auth audit
-- Fixes: analytics insert policy, anon grant on increment_deletes_used, adds is_onboarded column

-- 1. Fix analytics_events INSERT policy: restrict to the row's own user_id
DROP POLICY IF EXISTS "Service role can insert analytics" ON public.analytics_events;
CREATE POLICY "Users can insert own analytics" ON public.analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Revoke anon access to increment_deletes_used (only authenticated users should call it)
REVOKE EXECUTE ON FUNCTION public.increment_deletes_used(UUID, INTEGER) FROM anon;

-- 3. Add is_onboarded column to users table (replaces fragile created_at heuristic)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark existing users (created >1 min ago) as onboarded
UPDATE public.users SET is_onboarded = true WHERE created_at < NOW() - INTERVAL '1 minute';

-- Also update the handle_new_user trigger to set is_onboarded = false for new signups (already the default, but explicit)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, timezone, is_onboarded)
    VALUES (NEW.id, NEW.email, 'UTC', false);

    INSERT INTO public.subscriptions (user_id, provider, entitlement, status)
    VALUES (NEW.id, 'revenuecat', 'free', 'active');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
