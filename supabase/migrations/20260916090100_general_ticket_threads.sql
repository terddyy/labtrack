-- General ticket threads: conversations between a borrower (faculty/student) and custodians
-- that are not attached to a borrowing request or defect report.

alter table public.ticket_threads
  add column if not exists requester_id uuid references public.profiles(id) on delete cascade,
  add column if not exists subject text;

alter table public.ticket_threads drop constraint if exists ticket_thread_exact_subject;
alter table public.ticket_threads
  add constraint ticket_thread_exact_subject check (
    (subject_type = 'booking' and booking_id is not null and defect_report_id is null)
    or
    (subject_type = 'defect_report' and defect_report_id is not null and booking_id is null)
    or
    (
      subject_type = 'general'
      and booking_id is null
      and defect_report_id is null
      and requester_id is not null
      and char_length(btrim(coalesce(subject, ''))) between 1 and 120
    )
  );

create index if not exists ticket_threads_requester_created_idx
  on public.ticket_threads (requester_id, created_at desc)
  where requester_id is not null;

create or replace function app_private.ticket_thread_instructor_id(p_thread_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(b.instructor_id, dr.instructor_id, tt.requester_id)
  from public.ticket_threads tt
  left join public.bookings b on b.id = tt.booking_id
  left join public.defect_reports dr on dr.id = tt.defect_report_id
  where tt.id = p_thread_id
$$;

create or replace function app_private.can_access_ticket_thread(
  p_thread_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    app_private.is_admin_user(p_user_id)
    or exists (
      select 1
      from public.ticket_threads tt
      left join public.bookings b on b.id = tt.booking_id
      left join public.defect_reports dr on dr.id = tt.defect_report_id
      where tt.id = p_thread_id
        and (b.instructor_id = p_user_id or dr.instructor_id = p_user_id or tt.requester_id = p_user_id)
    ),
    false
  )
$$;

drop policy if exists "Ticket participants read threads" on public.ticket_threads;
create policy "Ticket participants read threads" on public.ticket_threads
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      (select app_private.is_active_user(auth.uid()))
      and (
        ticket_threads.requester_id = (select auth.uid())
        or exists (
          select 1
          from public.bookings b
          where b.id = ticket_threads.booking_id
            and b.instructor_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.defect_reports dr
          where dr.id = ticket_threads.defect_report_id
            and dr.instructor_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Ticket participants read messages" on public.ticket_messages;
create policy "Ticket participants read messages" on public.ticket_messages
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      (select app_private.is_active_user(auth.uid()))
      and exists (
        select 1
        from public.ticket_threads tt
        left join public.bookings b on b.id = tt.booking_id
        left join public.defect_reports dr on dr.id = tt.defect_report_id
        where tt.id = ticket_messages.thread_id
          and (
            tt.requester_id = (select auth.uid())
            or b.instructor_id = (select auth.uid())
            or dr.instructor_id = (select auth.uid())
          )
      )
    )
  );

-- Borrowers open a thread for themselves (p_requester_id must be null or their own id).
-- Custodians open a thread with a specific user by passing p_requester_id.
drop function if exists public.create_general_ticket(text, text, uuid);
create function public.create_general_ticket(p_subject text, p_body text, p_requester_id uuid default null)
returns public.ticket_threads
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_subject text;
  v_body text;
  v_requester_id uuid;
  v_thread public.ticket_threads%rowtype;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);
  v_subject := nullif(btrim(p_subject), '');
  v_body := nullif(btrim(p_body), '');

  if v_subject is null or char_length(v_subject) > 120 then
    raise exception 'Ticket subject must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if v_body is null or char_length(v_body) > 2000 then
    raise exception 'Ticket message must be between 1 and 2000 characters'
      using errcode = '22023';
  end if;

  if v_is_admin then
    if p_requester_id is null then
      raise exception 'Choose the user to message'
        using errcode = '22023';
    end if;

    if not exists (select 1 from public.profiles p where p.id = p_requester_id and p.is_active = true) then
      raise exception 'Recipient account is not active'
        using errcode = '22023';
    end if;

    v_requester_id := p_requester_id;
  else
    if p_requester_id is not null and p_requester_id <> v_actor_id then
      raise exception 'Cannot open a ticket for another user'
        using errcode = '42501';
    end if;

    v_requester_id := v_actor_id;
  end if;

  insert into public.ticket_threads (subject_type, requester_id, subject)
  values ('general'::public.thread_subject_type, v_requester_id, v_subject)
  returning * into v_thread;

  -- Reuses the send path so notifications behave the same as other tickets.
  perform public.send_ticket_message(v_thread.id, v_body);

  return v_thread;
end;
$$;

revoke all on function public.create_general_ticket(text, text, uuid) from public, anon;
grant execute on function public.create_general_ticket(text, text, uuid) to authenticated;
