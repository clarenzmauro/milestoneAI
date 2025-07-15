-- Supabase Schema for MilestoneAI Project
-- This file contains the SQL commands to set up the database schema

-- Enable Row Level Security (RLS) for all tables
-- This ensures users can only access their own data

-- Create the plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    goal TEXT NOT NULL,
    summary TEXT,
    timeline TEXT,
    monthly_milestones JSONB,
    weekly_objectives JSONB,
    daily_tasks JSONB,
    achievements JSONB DEFAULT '[]'::jsonb,
    chat_history JSONB DEFAULT '[]'::jsonb,
    interaction_mode TEXT DEFAULT 'chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on plans table
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for plans table
-- Users can only view their own plans
CREATE POLICY "Users can view own plans" ON plans
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own plans
CREATE POLICY "Users can insert own plans" ON plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own plans
CREATE POLICY "Users can update own plans" ON plans
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own plans
CREATE POLICY "Users can delete own plans" ON plans
    FOR DELETE USING (auth.uid() = user_id);

-- Create an index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);

-- Create an index on goal for better search performance
CREATE INDEX IF NOT EXISTS idx_plans_goal ON plans(goal);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_plans_updated_at 
    BEFORE UPDATE ON plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
