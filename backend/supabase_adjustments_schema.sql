create table if not exists public.adjustment_history (
  id bigint generated always as identity primary key,
  transformer_id text not null,
  adjustments jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learned_adjustments (
  parameter text primary key,
  adjustment_value double precision not null default 0,
  updated_at timestamptz not null default now()
);
