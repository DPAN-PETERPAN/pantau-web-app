-- PANTAU (Portal Antar Unit untuk Monitoring Terpadu) — initial schema
-- Simplified POC auth: no Supabase Auth / RLS-by-user. All access goes through
-- Next.js API routes using the service-role key; authorization is enforced in
-- application code based on a signed session cookie (see src/lib/session.ts).
-- RLS is still enabled with a default-deny policy as defense in depth — only
-- the service role (which bypasses RLS) can read/write.

create extension if not exists "pgcrypto";

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  category text not null check (category in ('A','B','C','D')),
  name text not null,
  target_label text not null default '',
  status text not null default 'notstarted'
    check (status in ('ontrack','behind','alert','notstarted','done')),
  plan_pct numeric,
  actual_pct numeric,
  created_at timestamptz not null default now()
);

create table checklist_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references checklist_phases(id) on delete cascade,
  sort_order int not null default 0,
  name text not null,
  due_label text not null default '',
  done boolean not null default false,
  status text not null default 'notstarted'
    check (status in ('ontrack','behind','notstarted','manual')),
  doc_date date,
  doc_number text,
  vendor text,
  contract_value text,
  doc_link text,          -- live link to the document (Drive/SharePoint/etc), replaces file upload
  notes text,
  updated_by uuid,        -- references access_tokens.id, nullable
  updated_at timestamptz
);

create table weekly_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  period_label text not null,
  submitted_at timestamptz not null default now(),
  submitted_by uuid,      -- references access_tokens.id
  status text not null check (status in ('ontrack','behind','alert','notstarted','done')),
  progres text[] not null default '{}',
  rencana text[] not null default '{}',
  link_url text,          -- optional live link to a supporting document
  edited_at timestamptz
);

-- Token-based login. A row here is either a team's shared code (role='team',
-- team_id set) or would be an admin code — in practice the admin logs in with
-- ADMIN_CODE from env, not a DB row, so role is only ever 'team' here.
create table access_tokens (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,   -- sha256(code), hex — the plaintext code is shown once at creation
  role text not null default 'team' check (role in ('team')),
  team_id uuid not null references teams(id) on delete cascade,
  label text not null default '',   -- admin's own note, e.g. "Tim GPAN2 - dibagikan 3 Sep 2026"
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index on projects (team_id);
create index on checklist_phases (project_id);
create index on checklist_items (phase_id);
create index on weekly_logs (project_id);
create index on access_tokens (team_id);

alter table teams enable row level security;
alter table projects enable row level security;
alter table checklist_phases enable row level security;
alter table checklist_items enable row level security;
alter table weekly_logs enable row level security;
alter table access_tokens enable row level security;
-- No policies defined: default-deny for anon/authenticated roles.
-- The service role used by the server always bypasses RLS.
