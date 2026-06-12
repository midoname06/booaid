-- Wafiq Agents — schema PostgreSQL (Supabase). Eseguire nell'SQL editor.
-- Multi-tenant ready: workspace_id ovunque. RLS attiva.

create extension if not exists "pgcrypto";
create extension if not exists vector;

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id),
  brand_logo_url text, brand_color text,
  settings jsonb default '{}',
  created_at timestamptz default now()
);

create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','agent','viewer')),
  primary key (workspace_id, user_id)
);
create index idx_members_user on workspace_members(user_id);

create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text, industry text, timezone text default 'Europe/Rome',
  business_hours jsonb, created_at timestamptz default now()
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  type text check (type in ('receptionist','sales','support','reactivation')),
  channels text[] default '{}',
  language text default 'it-IT', tone text, goal text,
  status text default 'draft' check (status in ('draft','active','paused')),
  config jsonb default '{}',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index idx_agents_ws on agents(workspace_id);

create table agent_prompts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  version int not null default 1,
  system_prompt text not null,
  is_active boolean default true
);
create index idx_prompts_agent on agent_prompts(agent_id);

create table agent_tools (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  tool_key text not null, config jsonb default '{}'
);
create index idx_tools_agent on agent_tools(agent_id);

create table workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  status text default 'draft' check (status in ('draft','active','paused')),
  graph jsonb default '{}', created_at timestamptz default now()
);
create index idx_wf_ws on workflows(workspace_id);

create table workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade,
  type text check (type in ('trigger','action','condition','delay','webhook')),
  subtype text, position jsonb, data jsonb default '{}'
);
create index idx_nodes_wf on workflow_nodes(workflow_id);

create table workflow_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade,
  source_node_id uuid references workflow_nodes(id) on delete cascade,
  target_node_id uuid references workflow_nodes(id) on delete cascade,
  condition_label text
);
create index idx_edges_wf on workflow_edges(workflow_id);

create table leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text, phone text, email text,
  status text default 'new' check (status in ('new','contacted','qualified','booked','lost')),
  tags text[] default '{}', source text, score int default 0,
  created_at timestamptz default now()
);
create index idx_leads_ws on leads(workspace_id);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  agent_id uuid references agents(id),
  lead_id uuid references leads(id),
  channel text, status text default 'open',
  sentiment text, last_message_at timestamptz default now()
);
create index idx_conv_ws on conversations(workspace_id);
create index idx_conv_last on conversations(last_message_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user','assistant','system','tool')),
  content text, tool_calls jsonb,
  created_at timestamptz default now()
);
create index idx_msg_conv on messages(conversation_id, created_at);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  lead_id uuid references leads(id), agent_id uuid references agents(id),
  service text, start_at timestamptz, end_at timestamptz,
  status text default 'confirmed' check (status in ('confirmed','cancelled','completed','no_show')),
  external_event_id text, created_at timestamptz default now()
);
create index idx_book_ws_start on bookings(workspace_id, start_at);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  provider text, credentials jsonb,  -- cifrare a livello app
  status text default 'disconnected'
);
create index idx_integr_ws on integrations(workspace_id);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  provider text, payload jsonb, processed boolean default false,
  created_at timestamptz default now()
);
create index idx_webhook_unprocessed on webhook_events(processed) where processed = false;

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  type text, meta jsonb, created_at timestamptz default now()
);
create index idx_an_ws_type on analytics_events(workspace_id, type, created_at);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  plan text, status text, stripe_customer_id text,
  stripe_subscription_id text, credits_balance int default 0
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, workspace_id uuid references workspaces(id),
  action text, target_type text, target_id uuid, meta jsonb,
  created_at timestamptz default now()
);
create index idx_audit_ws on audit_logs(workspace_id, created_at);

-- Knowledge base con embeddings (pgvector)
create table kb_chunks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  content text, embedding vector(1536)
);

-- Esempio policy RLS (ripetere per ogni tabella business)
alter table agents enable row level security;
create policy agents_member on agents for all using (
  exists (select 1 from workspace_members m where m.workspace_id = agents.workspace_id and m.user_id = auth.uid())
);
