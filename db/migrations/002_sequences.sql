-- Migrazione 002: sequenze follow-up
-- Eseguire nell'SQL editor di Supabase dopo schema.sql

create table if not exists sequences (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  name          text not null,
  trigger_type  text not null check (trigger_type in (
    'lead_created', 'lead_contacted', 'lead_qualified', 'booking_confirmed', 'manual'
  )),
  status        text default 'active' check (status in ('active', 'paused', 'draft')),
  created_at    timestamptz default now()
);
create index if not exists idx_seq_ws on sequences(workspace_id);

create table if not exists sequence_steps (
  id            uuid primary key default gen_random_uuid(),
  sequence_id   uuid references sequences(id) on delete cascade,
  position      int not null default 0,
  delay_minutes int not null default 0,
  channel       text not null check (channel in ('email', 'sms', 'whatsapp', 'webchat')),
  message       text not null,
  created_at    timestamptz default now()
);
create index if not exists idx_steps_seq on sequence_steps(sequence_id, position);

create table if not exists sequence_queue (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  sequence_id   uuid references sequences(id) on delete cascade,
  step_id       uuid references sequence_steps(id) on delete cascade,
  lead_id       uuid references leads(id) on delete cascade,
  scheduled_at  timestamptz not null,
  status        text default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  created_at    timestamptz default now()
);
create index if not exists idx_queue_scheduled on sequence_queue(scheduled_at) where status = 'pending';

-- RLS
alter table sequences       enable row level security;
alter table sequence_steps  enable row level security;
alter table sequence_queue  enable row level security;

create policy seq_member on sequences for all using (
  exists (select 1 from workspace_members m where m.workspace_id = sequences.workspace_id and m.user_id = auth.uid())
);
create policy steps_member on sequence_steps for all using (
  exists (select 1 from sequences s join workspace_members m on m.workspace_id = s.workspace_id
          where s.id = sequence_steps.sequence_id and m.user_id = auth.uid())
);
create policy queue_member on sequence_queue for all using (
  exists (select 1 from workspace_members m where m.workspace_id = sequence_queue.workspace_id and m.user_id = auth.uid())
);
