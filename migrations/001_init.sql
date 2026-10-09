-- SKULLVI Talent Engine: PostgreSQL schema.
-- Mirrors the diagrams: candidates are unique by e-mail, an application walks the state machine,
-- evaluations are append-only and remember the rubric version used, everything important is audited.

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email)),
  name          text not null,
  role          text not null check (role in ('admin', 'reviewer')),
  password_hash text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table posts (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null,
  organisation           text not null,
  summary                text not null,
  description            text not null,
  type                   text not null,
  mode                   text not null,
  location               text not null,
  deadline               date not null,
  start_date             date not null,
  info_session           date,
  seats                  int  not null default 1 check (seats >= 1),
  min_education          text not null default 'Aucun prérequis',
  languages              text not null default 'Français',
  missions               jsonb not null default '[]',
  must_have              jsonb not null default '[]',
  nice_to_have           jsonb not null default '[]',
  status                 text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  auto_queue             boolean not null default true,  -- scored applications go straight to review
  current_rubric_version int  not null default 1,
  created_by             uuid references users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table post_reviewers (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (post_id, user_id)
);

-- "Load post and rubric (current version)": one row per version, never updated.
create table rubrics (
  post_id    uuid not null references posts(id) on delete cascade,
  version    int  not null,
  config     jsonb not null,  -- weights, keywords, knockouts, range tables, tier overrides
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  primary key (post_id, version)
);

-- "Create candidate: new row, unique email"
create table candidates (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique check (email = lower(email)),
  first_name text not null,
  last_name  text not null,
  phone      text not null default '',
  country    text not null default '',
  city       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "Save application: status validated". Invalid submissions are never stored here (see audit_log).
create table applications (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique,
  post_id             uuid not null references posts(id),
  candidate_id        uuid not null references candidates(id),
  status              text not null check (status in ('validated', 'ineligible', 'scored', 'in_review', 'shortlisted', 'declined')),
  source              text not null check (source in ('form', 'csv')),
  returning_candidate boolean not null default false,  -- "Reuse record: flag duplicate"
  data                jsonb not null,                  -- normalized submission snapshot
  files               jsonb not null default '[]',
  decided_by          uuid references users(id),
  decided_at          timestamptz,
  decision_note       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint applications_post_candidate_key unique (post_id, candidate_id)
);
create index applications_post_status_idx on applications (post_id, status);

-- "Save evaluation: score, tier, audit log". Append-only; the latest row is the current one.
create table evaluations (
  id             uuid primary key default gen_random_uuid(),
  seq            bigserial not null,
  application_id uuid not null references applications(id) on delete cascade,
  rubric_version int  not null,
  eligible       boolean not null,
  knockouts      jsonb not null default '[]',
  total          numeric(5, 2),  -- null when ineligible
  tier           text,
  breakdown      jsonb not null default '[]',
  flags          jsonb not null default '[]',
  created_at     timestamptz not null default now()
);
create index evaluations_app_seq_idx on evaluations (application_id, seq desc);

-- Reviewer: "Add note / adjust"
create table notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_id      uuid not null references users(id),
  body           text not null check (length(body) between 1 and 4000),
  created_at     timestamptz not null default now()
);
create index notes_app_idx on notes (application_id);

create table score_adjustments (
  id             uuid primary key default gen_random_uuid(),
  seq            bigserial not null,
  application_id uuid not null references applications(id) on delete cascade,
  author_id      uuid not null references users(id),
  delta          int  not null check (delta between -20 and 20),
  reason         text not null check (length(reason) between 3 and 1000),
  created_at     timestamptz not null default now()
);
create index adjustments_app_seq_idx on score_adjustments (application_id, seq desc);

-- AI top 3: "Log prompt and output (audit trail, model version)"
create table ai_runs (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references posts(id) on delete cascade,
  requested_by    uuid references users(id),
  status          text not null check (status in ('ok', 'fallback')),
  fallback_reason text,
  model           text,            -- model version reported by the API (null for fallback)
  prompt          text not null,   -- exactly what was sent (anonymized)
  raw_output      text,
  candidate_map   jsonb not null,  -- alias (C1..) -> application id
  result          jsonb not null,  -- top 3 with reasons, by application id
  confirmed_by    uuid references users(id),
  confirmed_at    timestamptz,
  confirmed_order jsonb,           -- "Reviewer confirms: accept, reorder, reject"
  created_at      timestamptz not null default now()
);
create index ai_runs_post_idx on ai_runs (post_id, created_at desc);

create table imports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id),
  uploaded_by uuid references users(id),
  filename    text not null,
  total       int not null,
  accepted    int not null,
  rejected    int not null,
  report      jsonb not null,
  created_at  timestamptz not null default now()
);

create table audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_label text not null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  details     jsonb not null default '{}'
);
create index audit_entity_idx on audit_log (entity_type, entity_id, id desc);
