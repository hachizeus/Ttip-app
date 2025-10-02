-- Phase 2 Database Schema Extensions
-- Add missing tables and columns for teams, enhanced reviews, and milestones

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    worker_id TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
    status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive')),
    joined_at TIMESTAMP DEFAULT now(),
    created_at TIMESTAMP DEFAULT now()
);

-- Add rating columns to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add milestone tracking to workers
ALTER TABLE workers ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS last_milestone INTEGER DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_worker_id ON team_members(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_rating ON workers(average_rating);

-- RLS policies for new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access teams" ON teams FOR ALL USING (true);
CREATE POLICY "Public access team_members" ON team_members FOR ALL USING (true);