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
  updated_at timestamptz,
  record_type text not null default 'inspections' check (record_type in ('inspections', 'notifications', 'infractions')),
  amount numeric(12, 2),
  image_data text
);

alter table public.inspections add column if not exists record_type text not null default 'inspections';
alter table public.inspections add column if not exists amount numeric(12, 2);
alter table public.inspections add column if not exists image_data text;

alter table public.inspections enable row level security;

drop policy if exists "Allow public inspection access" on public.inspections;
create policy "Allow public inspection access"
  on public.inspections
  for all
  to anon, authenticated
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inspections'
  ) then
    alter publication supabase_realtime add table public.inspections;
  end if;
end $$;
