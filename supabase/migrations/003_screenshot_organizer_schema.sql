-- Migration: Dedicated schema for Screenshot Organizer
-- Safe for production: uses its own schema, does NOT touch public.* or other apps' triggers.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- Schema
-- ─────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS screenshot_organizer;

GRANT USAGE ON SCHEMA screenshot_organizer TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_organizer.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    timezone    TEXT NOT NULL DEFAULT 'UTC',
    is_onboarded BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE screenshot_organizer.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_users_select" ON screenshot_organizer.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "so_users_update" ON screenshot_organizer.users
    FOR UPDATE USING (auth.uid() = id);

GRANT SELECT, UPDATE ON screenshot_organizer.users TO authenticated;
GRANT ALL ON screenshot_organizer.users TO service_role;

-- ─────────────────────────────────────────────
-- Subscriptions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_organizer.subscriptions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES screenshot_organizer.users(id) ON DELETE CASCADE,
    provider    TEXT NOT NULL DEFAULT 'revenuecat',
    entitlement TEXT NOT NULL CHECK (entitlement IN ('free', 'premium', 'lifetime')) DEFAULT 'free',
    status      TEXT NOT NULL DEFAULT 'active',
    expires_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

ALTER TABLE screenshot_organizer.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_subscriptions_select" ON screenshot_organizer.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON screenshot_organizer.subscriptions TO authenticated;
GRANT ALL ON screenshot_organizer.subscriptions TO service_role;

-- ─────────────────────────────────────────────
-- Assets
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_organizer.assets (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES screenshot_organizer.users(id) ON DELETE CASCADE,
    platform_asset_id TEXT NOT NULL,
    type              TEXT NOT NULL DEFAULT 'screenshot',
    created_at_device TIMESTAMPTZ NOT NULL,
    size_bytes        BIGINT NOT NULL,
    hash              TEXT,
    tags              TEXT[] DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE screenshot_organizer.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_assets_all" ON screenshot_organizer.assets
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_so_assets_user_id ON screenshot_organizer.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_so_assets_created_at ON screenshot_organizer.assets(created_at_device);

GRANT SELECT, INSERT, UPDATE, DELETE ON screenshot_organizer.assets TO authenticated;
GRANT ALL ON screenshot_organizer.assets TO service_role;

-- ─────────────────────────────────────────────
-- Cleanup sessions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_organizer.cleanup_sessions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES screenshot_organizer.users(id) ON DELETE CASCADE,
    started_at     TIMESTAMPTZ DEFAULT NOW(),
    ended_at       TIMESTAMPTZ,
    reviewed_count INTEGER DEFAULT 0,
    deleted_count  INTEGER DEFAULT 0,
    archived_count INTEGER DEFAULT 0,
    saved_bytes    BIGINT DEFAULT 0
);

ALTER TABLE screenshot_organizer.cleanup_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_cleanup_sessions_all" ON screenshot_organizer.cleanup_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_so_cleanup_sessions_user_id ON screenshot_organizer.cleanup_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_so_cleanup_sessions_started_at ON screenshot_organizer.cleanup_sessions(started_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON screenshot_organizer.cleanup_sessions TO authenticated;
GRANT ALL ON screenshot_organizer.cleanup_sessions TO service_role;

-- ─────────────────────────────────────────────
-- Cleanup actions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_organizer.cleanup_actions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES screenshot_organizer.cleanup_sessions(id) ON DELETE CASCADE,
    asset_id   UUID NOT NULL REFERENCES screenshot_organizer.assets(id) ON DELETE CASCADE,
    action     TEXT NOT NULL CHECK (action IN ('keep', 'delete', 'archive', 'undo')),
    action_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE screenshot_organizer.cleanup_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_cleanup_actions_all" ON screenshot_organizer.cleanup_actions
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM screenshot_organizer.cleanup_sessions WHERE id = cleanup_actions.session_id
        )
    );

CREATE INDEX IF NOT EXISTS idx_so_cleanup_actions_session_id ON screenshot_organizer.cleanup_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_so_cleanup_actions_action_at ON screenshot_organizer.cleanup_actions(action_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON screenshot_organizer.cleanup_actions TO authenticated;
GRANT ALL ON screenshot_organizer.cleanup_actions TO service_role;

-- ─────────────────────────────────────────────
-- Usage counters (trust limit tracking)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_organizer.usage_counters (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES screenshot_organizer.users(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end   TIMESTAMPTZ NOT NULL,
    deletes_used INTEGER DEFAULT 0,
    trust_limit  INTEGER DEFAULT 15,
    UNIQUE (user_id, period_start)
);

ALTER TABLE screenshot_organizer.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_usage_counters_select" ON screenshot_organizer.usage_counters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "so_usage_counters_insert" ON screenshot_organizer.usage_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "so_usage_counters_update" ON screenshot_organizer.usage_counters
    FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON screenshot_organizer.usage_counters TO authenticated;
GRANT ALL ON screenshot_organizer.usage_counters TO service_role;

-- ─────────────────────────────────────────────
-- Analytics events
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_organizer.analytics_events (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES screenshot_organizer.users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE screenshot_organizer.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_analytics_events_insert" ON screenshot_organizer.analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "so_analytics_events_select" ON screenshot_organizer.analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_so_analytics_events_user_id ON screenshot_organizer.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_so_analytics_events_created_at ON screenshot_organizer.analytics_events(created_at);

GRANT INSERT, SELECT ON screenshot_organizer.analytics_events TO authenticated;
GRANT ALL ON screenshot_organizer.analytics_events TO service_role;

-- ─────────────────────────────────────────────
-- Function: increment_deletes_used
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION screenshot_organizer.increment_deletes_used(
    p_user_id UUID,
    p_count   INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_counter RECORD;
    v_remaining INTEGER;
BEGIN
    UPDATE screenshot_organizer.usage_counters
    SET deletes_used = deletes_used + p_count
    WHERE user_id = p_user_id
      AND period_end > NOW()
    RETURNING * INTO v_counter;

    IF NOT FOUND THEN
        INSERT INTO screenshot_organizer.usage_counters (
            user_id, period_start, period_end, deletes_used, trust_limit
        ) VALUES (
            p_user_id, NOW(), NOW() + INTERVAL '24 hours', p_count, 15
        )
        RETURNING * INTO v_counter;
    END IF;

    v_remaining := v_counter.trust_limit - v_counter.deletes_used;

    RETURN jsonb_build_object(
        'success',      true,
        'can_delete',   v_remaining > 0,
        'remaining',    GREATEST(0, v_remaining),
        'deletes_used', v_counter.deletes_used
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION screenshot_organizer.increment_deletes_used(UUID, INTEGER) TO authenticated;

-- ─────────────────────────────────────────────
-- Trigger: auto-create user row + free subscription on signup
-- Name is unique so it never collides with other apps' triggers.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION screenshot_organizer.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO screenshot_organizer.users (id, email, timezone, is_onboarded)
    VALUES (NEW.id, NEW.email, 'UTC', false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO screenshot_organizer.subscriptions (user_id, provider, entitlement, status)
    VALUES (NEW.id, 'revenuecat', 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop only our own trigger (safe - never drops other apps' triggers)
DROP TRIGGER IF EXISTS on_auth_user_created_screenshot_organizer ON auth.users;
CREATE TRIGGER on_auth_user_created_screenshot_organizer
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION screenshot_organizer.handle_new_user();
