create table if not exists public.inspections (
  id uuid primary key,
  performed_date date not null,
  deadline integer not null,
  return_date date not null,
  description text not null,
  performed_by text not null check (performed_by in ('Alana', 'João', 'Ana Paula')),
  created_at timestamptz not null default now(),
  completed boolean not null default false,
  updated_by text,
  updated_at timestamptz
);

alter table public.inspections enable row level security;

drop policy if exists "Allow public inspection access" on public.inspections;
create policy "Allow public inspection access"
  on public.inspections
  for all
  to anon, authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.inspections;
