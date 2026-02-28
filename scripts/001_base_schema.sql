-- TradeSwarm Base Schema
-- Migration 001: Core tables for user profiles, preferences, and trades

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE IF NOT EXISTS preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  safety_mode TEXT DEFAULT 'training_wheels' CHECK (safety_mode IN ('training_wheels', 'normal', 'pro')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Portfolio stats
CREATE TABLE IF NOT EXISTS portfolio_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 10000.00,
  day_pnl DECIMAL(12,2) DEFAULT 0.00,
  week_pnl DECIMAL(12,2) DEFAULT 0.00,
  total_pnl DECIMAL(12,2) DEFAULT 0.00,
  trades_today INTEGER DEFAULT 0,
  paper_trades_completed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('GO', 'WAIT', 'NO')),
  trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
  amount DECIMAL(12,2),
  entry_price DECIMAL(12,4),
  exit_price DECIMAL(12,4),
  pnl DECIMAL(12,2),
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'pending', 'cancelled')),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own preferences" ON preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON preferences FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own portfolio" ON portfolio_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio" ON portfolio_stats FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own trades" ON trades FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlist" ON watchlist FOR ALL USING (auth.uid() = user_id);

-- Trigger for new user setup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO preferences (user_id) VALUES (NEW.id);
  INSERT INTO portfolio_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
