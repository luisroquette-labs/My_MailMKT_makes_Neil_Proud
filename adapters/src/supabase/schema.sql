create table if not exists public.nurture_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique check (email = lower(email)),
  whatsapp text,
  company text,
  role text,
  segment text,
  interest text,
  source text,
  page text,
  created_at timestamptz not null default now()
);
create table if not exists public.nurture_email_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.nurture_leads(id) on delete cascade,
  to_email text not null,
  email_type text not null,
  resend_id text,
  resend_attempted_at timestamptz,
  sent_at timestamptz not null default now(),
  constraint nurture_email_log_unique unique (to_email, email_type)
);
create index if not exists nurture_email_log_sent_at_idx on public.nurture_email_log (sent_at);
create table if not exists public.nurture_suppressions (
  email text primary key check (email = lower(email)),
  reason text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.nurture_email_outbox (
  idempotency_key text primary key,
  email_args jsonb not null,
  source text not null,
  source_ids text[] not null default '{}',
  reserved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  resend_id text,
  last_error text,
  attempt_token text,
  lease_until timestamptz,
  dead_letter_at timestamptz
);
create table if not exists public.nurture_email_events (
  id uuid primary key,
  email text not null,
  email_type text not null,
  opened_at timestamptz,
  clicked_at timestamptz,
  last_click_url text
);
create table if not exists public.nurture_config (
  singleton boolean primary key default true,
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint nurture_config_singleton check (singleton)
);
insert into public.nurture_config (singleton, dados)
values (true, '{}'::jsonb)
on conflict (singleton) do nothing;
create table if not exists public.nurture_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  offer_name text not null,
  offer_url text not null,
  objective text not null,
  audience text not null,
  status text not null default 'paused'
    check (status in ('active', 'paused', 'completed')),
  cadence text not null check (cadence in ('hourly', 'daily', 'weekly')),
  weekdays smallint[] not null default '{}',
  timezone text not null default 'America/Sao_Paulo',
  start_date date not null,
  end_date date,
  next_send_on timestamptz,
  send_index integer not null default 0,
  sent_occurrences integer not null default 0,
  last_sent_on timestamptz,
  paused_at timestamptz,
  throttle_exempt boolean,
  interval_days integer not null default 1,
  send_hour text not null default '10:00',
  audience_filter jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (
    char_length(slug) between 1 and 80
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  destination_url text not null,
  tracked_destination_url text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  created_at timestamptz not null default now()
);
alter table public.nurture_leads enable row level security;
alter table public.nurture_email_log enable row level security;
alter table public.nurture_suppressions enable row level security;
alter table public.nurture_email_outbox enable row level security;
alter table public.nurture_email_events enable row level security;
alter table public.nurture_config enable row level security;
alter table public.nurture_marketing_campaigns enable row level security;
alter table public.tracking_links enable row level security;
create or replace function public.reserve_nurture_email_outbox(
  p_idempotency_key text, p_email_args jsonb, p_source text, p_source_ids text[]
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.nurture_email_outbox (idempotency_key, email_args, source, source_ids)
  values (p_idempotency_key, p_email_args, p_source, p_source_ids)
  on conflict (idempotency_key) do nothing;
  return found;
end $$;

create or replace function public.complete_nurture_email_outbox(
  p_idempotency_key text, p_resend_id text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.nurture_email_outbox
     set sent_at = now(), resend_id = p_resend_id
   where idempotency_key = p_idempotency_key;
end $$;

create or replace function public.release_nurture_email_outbox(
  p_idempotency_key text, p_last_error text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.nurture_email_outbox
     set last_attempt_at = now(), last_error = p_last_error, lease_until = null
   where idempotency_key = p_idempotency_key;
end $$;
create or replace function public.claim_nurture_email_outbox(
  p_idempotency_key text, p_lease_minutes int default 5
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email_args jsonb;
begin
  update public.nurture_email_outbox
     set lease_until = now() + (p_lease_minutes || ' minutes')::interval,
         last_attempt_at = now()
   where idempotency_key = p_idempotency_key
     and sent_at is null
     and dead_letter_at is null
     and (lease_until is null or lease_until < now())
     returning email_args into v_email_args;
  return v_email_args;
end $$;
create or replace function public.list_nurture_email_outbox_pending()
returns table (
  idempotency_key text, email_args jsonb,
  created_at timestamptz, last_attempt_at timestamptz
) language sql security definer set search_path = public as $$
  select o.idempotency_key, o.email_args, o.created_at, o.last_attempt_at
    from public.nurture_email_outbox o
   where o.sent_at is null and o.dead_letter_at is null
$$;
create or replace function public.remove_nurture_email_outbox_orfas(
  p_older_than timestamptz
) returns integer language sql security definer set search_path = public as $$
  with removidas as (
    delete from public.nurture_email_outbox
     where reserved_at < p_older_than and last_attempt_at is null and sent_at is null
     returning 1
  ) select count(*)::integer from removidas
$$;
create or replace function public.discard_nurture_email_outbox(
  p_idempotency_key text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.nurture_email_outbox
     set dead_letter_at = now()
   where idempotency_key = p_idempotency_key;
end $$;
revoke execute on function public.reserve_nurture_email_outbox(text, jsonb, text, text[]) from public, anon, authenticated;
revoke execute on function public.complete_nurture_email_outbox(text, text) from public, anon, authenticated;
revoke execute on function public.release_nurture_email_outbox(text, text) from public, anon, authenticated;
revoke execute on function public.claim_nurture_email_outbox(text, integer) from public, anon, authenticated;
revoke execute on function public.list_nurture_email_outbox_pending() from public, anon, authenticated;
revoke execute on function public.remove_nurture_email_outbox_orfas(timestamptz) from public, anon, authenticated;
revoke execute on function public.discard_nurture_email_outbox(text) from public, anon, authenticated;
grant execute on function public.reserve_nurture_email_outbox(text, jsonb, text, text[]) to service_role;
grant execute on function public.complete_nurture_email_outbox(text, text) to service_role;
grant execute on function public.release_nurture_email_outbox(text, text) to service_role;
grant execute on function public.claim_nurture_email_outbox(text, integer) to service_role;
grant execute on function public.list_nurture_email_outbox_pending() to service_role;
grant execute on function public.remove_nurture_email_outbox_orfas(timestamptz) to service_role;
grant execute on function public.discard_nurture_email_outbox(text) to service_role;
