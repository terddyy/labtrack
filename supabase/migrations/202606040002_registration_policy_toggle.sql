create table if not exists public.registration_settings (
  id boolean primary key default true,
  restrict_signup_to_allowed_domains boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_settings_singleton check (id = true)
);

insert into public.registration_settings (id, restrict_signup_to_allowed_domains)
values (true, true)
on conflict (id) do nothing;

alter table public.registration_settings enable row level security;

drop policy if exists "Custodians read registration settings" on public.registration_settings;
drop policy if exists "Super admins manage registration settings" on public.registration_settings;

create policy "Custodians read registration settings" on public.registration_settings
  for select to authenticated
  using ((select app_private.is_admin()));

create policy "Super admins manage registration settings" on public.registration_settings
  for all to authenticated
  using ((select app_private.is_super_admin()))
  with check ((select app_private.is_super_admin()));

create or replace function app_private.touch_registration_settings_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists registration_settings_touch_updated_at on public.registration_settings;
create trigger registration_settings_touch_updated_at
  before update on public.registration_settings
  for each row execute function app_private.touch_registration_settings_updated_at();

create or replace function app_private.normalize_email_domain(p_domain text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(btrim(coalesce(p_domain, ''))), '^@+', '');
$$;

update public.university_email_domains
set domain = app_private.normalize_email_domain(domain);

create or replace function app_private.normalize_university_email_domain_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.domain := app_private.normalize_email_domain(new.domain);

  if new.domain = '' or new.domain ~ '\s' or position('@' in new.domain) > 0 then
    raise exception 'Email domain is invalid.';
  end if;

  return new;
end;
$$;

drop trigger if exists university_email_domains_normalize_domain on public.university_email_domains;
create trigger university_email_domains_normalize_domain
  before insert or update of domain on public.university_email_domains
  for each row execute function app_private.normalize_university_email_domain_row();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'university_email_domains_domain_normalized'
      and conrelid = 'public.university_email_domains'::regclass
  ) then
    alter table public.university_email_domains
      add constraint university_email_domains_domain_normalized
      check (
        domain = regexp_replace(lower(btrim(coalesce(domain, ''))), '^@+', '')
        and domain <> ''
        and domain !~ '\s'
        and position('@' in domain) = 0
      ) not valid;
  end if;
end;
$$;

alter table public.university_email_domains
  validate constraint university_email_domains_domain_normalized;

create unique index if not exists university_email_domains_domain_lower_key
  on public.university_email_domains (lower(domain));

create or replace function app_private.is_signup_domain_restriction_enabled()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select restrict_signup_to_allowed_domains
      from public.registration_settings
      where id = true
    ),
    true
  );
$$;

create or replace function app_private.is_university_email_allowed(p_email text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  with normalized as (
    select app_private.normalize_email_domain(split_part(coalesce(p_email, ''), '@', 2)) as email_domain
  ),
  configured as (
    select count(*) filter (where is_allowed) as allowed_count
    from public.university_email_domains
  )
  select case
    when (select email_domain from normalized) = '' then false
    when (select allowed_count from configured) = 0 then false
    else exists (
      select 1
      from public.university_email_domains d, normalized n
      where d.is_allowed = true
        and app_private.normalize_email_domain(d.domain) = n.email_domain
    )
  end;
$$;

create or replace function public.hook_restrict_signup_by_email_domain(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  v_email := event->'user'->>'email';

  if not app_private.is_signup_domain_restriction_enabled() then
    return '{}'::jsonb;
  end if;

  if app_private.is_university_email_allowed(v_email) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'Use a university email account to access LABTRACK.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_signup_by_email_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_by_email_domain(jsonb) from authenticated, anon, public;
