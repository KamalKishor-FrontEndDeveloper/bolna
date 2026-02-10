-- 0001_init.sql
-- Create api_configurations, users, agents, executions tables

CREATE TABLE IF NOT EXISTS api_configurations (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bolna_sub_account_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bolna_agent_id TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  agent_config JSONB NOT NULL,
  agent_prompts JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  bolna_execution_id TEXT NOT NULL UNIQUE,
  transcript TEXT DEFAULT '',
  recording_url TEXT,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
