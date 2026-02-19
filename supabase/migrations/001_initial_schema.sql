-- Migration: Initial schema for Screenshot Organizer
-- Created: 2024-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timezone TEXT DEFAULT 'UTC'
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'revenuecat',
    entitlement TEXT NOT NULL CHECK (entitlement IN ('free', 'premium', 'lifetime')),
    status TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Assets table (screenshots)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    platform_asset_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'screenshot',
    created_at_device TIMESTAMP WITH TIME ZONE NOT NULL,
    size_bytes BIGINT NOT NULL,
    hash TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Users can CRUD own assets
CREATE POLICY "Users can manage own assets" ON public.assets
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for assets
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON public.assets(created_at_device);

-- Cleanup sessions table
CREATE TABLE IF NOT EXISTS public.cleanup_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    reviewed_count INTEGER DEFAULT 0,
    deleted_count INTEGER DEFAULT 0,
    archived_count INTEGER DEFAULT 0,
    saved_bytes BIGINT DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.cleanup_sessions ENABLE ROW LEVEL SECURITY;

-- Users can CRUD own sessions
CREATE POLICY "Users can manage own sessions" ON public.cleanup_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_cleanup_sessions_user_id ON public.cleanup_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_sessions_started_at ON public.cleanup_sessions(started_at);

-- Cleanup actions table
CREATE TABLE IF NOT EXISTS public.cleanup_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.cleanup_sessions(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('keep', 'delete', 'archive', 'undo')),
    action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cleanup_actions ENABLE ROW LEVEL SECURITY;

-- Users can CRUD own actions
CREATE POLICY "Users can manage own actions" ON public.cleanup_actions
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.cleanup_sessions WHERE id = cleanup_actions.session_id
        )
    );

-- Indexes for actions
CREATE INDEX IF NOT EXISTS idx_cleanup_actions_session_id ON public.cleanup_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_actions_action_at ON public.cleanup_actions(action_at);

-- Usage counters table (trust limit tracking)
CREATE TABLE IF NOT EXISTS public.usage_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    deletes_used INTEGER DEFAULT 0,
    trust_limit INTEGER DEFAULT 15,
    UNIQUE(user_id, period_start)
);

-- Enable RLS
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Users can read own usage
CREATE POLICY "Users can view own usage" ON public.usage_counters
    FOR SELECT USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into users table
    INSERT INTO public.users (id, email, timezone)
    VALUES (NEW.id, NEW.email, 'UTC');
    
    -- Create free subscription
    INSERT INTO public.subscriptions (user_id, provider, entitlement, status)
    VALUES (NEW.id, 'revenuecat', 'free', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert analytics
CREATE POLICY "Service role can insert analytics" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own analytics" ON public.analytics_events
    FOR SELECT USING (auth.uid() = user_id);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Function to increment deletes used (for edge function compatibility)
CREATE OR REPLACE FUNCTION public.increment_deletes_used(
    p_user_id UUID,
    p_count INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_counter RECORD;
    v_remaining INTEGER;
BEGIN
    -- Try to update existing counter
    UPDATE public.usage_counters
    SET deletes_used = deletes_used + p_count
    WHERE user_id = p_user_id
    AND period_end > NOW()
    RETURNING * INTO v_counter;
    
    IF NOT FOUND THEN
        -- Create new counter for this period
        INSERT INTO public.usage_counters (
            user_id,
            period_start,
            period_end,
            deletes_used,
            trust_limit
        ) VALUES (
            p_user_id,
            NOW(),
            NOW() + INTERVAL '24 hours',
            p_count,
            15
        )
        RETURNING * INTO v_counter;
    END IF;
    
    v_remaining := v_counter.trust_limit - v_counter.deletes_used;
    
    RETURN jsonb_build_object(
        'success', true,
        'can_delete', v_remaining > 0,
        'remaining', GREATEST(0, v_remaining),
        'deletes_used', v_counter.deletes_used
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_deletes_used(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_deletes_used(UUID, INTEGER) TO anon;

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('20240101000000') ON CONFLICT DO NOTHING;
