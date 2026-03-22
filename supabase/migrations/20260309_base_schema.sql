-- Migration: 20260309_base_schema
-- Core tables: profiles, user_preferences, portfolio_stats, watchlist
-- Also creates the new-user trigger that bootstraps all three per-user rows.

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE  USING (auth.uid() = id);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  safety_mode  TEXT DEFAULT 'training_wheels'
               CHECK (safety_mode IN ('training_wheels', 'normal', 'pro')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  theme        TEXT DEFAULT 'dark',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_select_own" ON user_preferences FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_insert_own" ON user_preferences FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_preferences_update_own" ON user_preferences FOR UPDATE  USING (auth.uid() = user_id);

-- Portfolio stats
CREATE TABLE IF NOT EXISTS portfolio_stats (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance                NUMERIC(15, 2) DEFAULT 10000.00,
  day_pnl                NUMERIC(15, 2) DEFAULT 0.00,
  week_pnl               NUMERIC(15, 2) DEFAULT 0.00,
  total_pnl              NUMERIC(15, 2) DEFAULT 0.00,
  trades_today           INTEGER DEFAULT 0,
  total_trades           INTEGER DEFAULT 0,
  paper_trades_completed INTEGER DEFAULT 0,
  simulations_completed  INTEGER DEFAULT 0,
  paper_trades_required  INTEGER DEFAULT 50,
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE portfolio_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_stats_select_own" ON portfolio_stats FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "portfolio_stats_insert_own" ON portfolio_stats FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio_stats_update_own" ON portfolio_stats FOR UPDATE  USING (auth.uid() = user_id);

-- Watchlist
-- NOTE: API route uses `theme` and `created_at` columns.
CREATE TABLE IF NOT EXISTS watchlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     TEXT NOT NULL,
  theme      TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlist_all_own" ON watchlist FOR ALL USING (auth.uid() = user_id);

-- Trigger: bootstrap profile, preferences, and portfolio stats on new user sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)        VALUES (NEW.id, NEW.email)  ON CONFLICT (id) DO NOTHING;
  INSERT INTO user_preferences (user_id)  VALUES (NEW.id)             ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO portfolio_stats (user_id)   VALUES (NEW.id)             ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
