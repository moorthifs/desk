-- =====================================================================
-- Moorthi Financial Services — TDS Upload Portal
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it uses IF NOT EXISTS / OR REPLACE where it can.
-- =====================================================================

-- ---------- Profiles (one row per customer / admin) ------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  firm_name   text not null default '',
  phone       text not null default '',
  email       text not null default '',
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, firm_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'firm_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- Fee settings (single row, admin-editable) ----------------
-- TIN-FC upload fees are excluding GST. Update them here (or from the
-- Admin → Fees screen) whenever Protean revises them.
create table if not exists public.fee_settings (
  id                  int primary key default 1 check (id = 1),
  slab1_fee           numeric(10,2) not null default 42.37,   -- up to 100 records
  slab2_fee           numeric(10,2) not null default 178.00,  -- 101 to 1000 records
  slab3_fee           numeric(10,2) not null default 578.50,  -- more than 1000 records
  tin_gst_rate        numeric(5,2)  not null default 18.00,   -- GST % on TIN fee
  service_charge      numeric(10,2) not null default 199.00,  -- our charge per return
  service_gst_rate    numeric(5,2)  not null default 0.00,    -- GST % on our charge (set 18 if billing GST)
  updated_at          timestamptz not null default now()
);
insert into public.fee_settings (id) values (1) on conflict (id) do nothing;

-- ---------- TDS returns ---------------------------------------------
do $$ begin
  create type public.tds_status as enum
    ('awaiting_payment', 'paid', 'in_progress', 'uploaded', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.tds_returns (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  tan                  text not null check (tan ~ '^[A-Z]{4}[0-9]{5}[A-Z]$'),
  deductor_name        text not null,
  form_type            text not null check (form_type in ('24Q','26Q','27Q','27EQ')),
  financial_year       text not null check (financial_year ~ '^[0-9]{4}-[0-9]{2}$'),
  quarter              text not null check (quarter in ('Q1','Q2','Q3','Q4')),
  statement_type       text not null check (statement_type in ('regular','correction')),
  record_count         int  not null check (record_count between 1 and 1000000),
  customer_note        text not null default '',
  fvu_path             text,
  form27a_path         text,
  extra_path           text,
  -- amounts (₹) — always computed by the database, never by the browser
  tin_fee              numeric(10,2) not null,
  tin_gst              numeric(10,2) not null,
  service_fee          numeric(10,2) not null,
  service_gst          numeric(10,2) not null,
  total_amount         numeric(10,2) not null,
  status               public.tds_status not null default 'awaiting_payment',
  razorpay_order_id    text unique,
  razorpay_payment_id  text,
  paid_at              timestamptz,
  token_number         text,          -- 15-digit provisional receipt number
  ack_path             text,          -- acknowledgement file uploaded by admin
  admin_note           text not null default '',
  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists tds_returns_user_idx   on public.tds_returns(user_id, created_at desc);
create index if not exists tds_returns_status_idx on public.tds_returns(status, created_at);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists tds_returns_touch on public.tds_returns;
create trigger tds_returns_touch before update on public.tds_returns
  for each row execute function public.touch_updated_at();

-- ---------- Fee calculation (server side) ----------------------------
create or replace function public.quote_fee(p_record_count int)
returns table (tin_fee numeric, tin_gst numeric, service_fee numeric, service_gst numeric, total_amount numeric)
language plpgsql stable security definer set search_path = public as $$
declare s public.fee_settings;
begin
  select * into s from public.fee_settings where id = 1;
  tin_fee := case when p_record_count <= 100 then s.slab1_fee
                  when p_record_count <= 1000 then s.slab2_fee
                  else s.slab3_fee end;
  tin_gst := round(tin_fee * s.tin_gst_rate / 100, 2);
  service_fee := s.service_charge;
  service_gst := round(service_fee * s.service_gst_rate / 100, 2);
  total_amount := round(tin_fee + tin_gst + service_fee + service_gst, 0); -- round to whole rupee
  return next;
end $$;

-- Customer creates a return. Amounts are filled here, so the browser
-- cannot change the price.
create or replace function public.create_tds_return(
  p_tan text, p_deductor_name text, p_form_type text, p_financial_year text,
  p_quarter text, p_statement_type text, p_record_count int, p_customer_note text default ''
) returns public.tds_returns
language plpgsql security definer set search_path = public as $$
declare q record; r public.tds_returns;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into q from public.quote_fee(p_record_count);
  insert into public.tds_returns (
    user_id, tan, deductor_name, form_type, financial_year, quarter, statement_type,
    record_count, customer_note, tin_fee, tin_gst, service_fee, service_gst, total_amount)
  values (
    auth.uid(), upper(trim(p_tan)), trim(p_deductor_name), p_form_type, p_financial_year,
    p_quarter, p_statement_type, p_record_count, coalesce(p_customer_note, ''),
    q.tin_fee, q.tin_gst, q.service_fee, q.service_gst, q.total_amount)
  returning * into r;
  return r;
end $$;

-- Customer attaches uploaded file paths (only before payment, only own files).
create or replace function public.attach_tds_files(
  p_return_id uuid, p_fvu_path text, p_form27a_path text, p_extra_path text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare prefix text;
begin
  prefix := auth.uid()::text || '/' || p_return_id::text || '/';
  if p_fvu_path is null or left(p_fvu_path, length(prefix)) <> prefix
     or p_form27a_path is null or left(p_form27a_path, length(prefix)) <> prefix
     or (p_extra_path is not null and left(p_extra_path, length(prefix)) <> prefix) then
    raise exception 'Invalid file path';
  end if;
  update public.tds_returns
     set fvu_path = p_fvu_path, form27a_path = p_form27a_path, extra_path = p_extra_path
   where id = p_return_id and user_id = auth.uid() and status = 'awaiting_payment';
  if not found then raise exception 'Return not found or already paid'; end if;
end $$;

-- Customer may delete an unpaid draft.
create or replace function public.delete_unpaid_return(p_return_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.tds_returns
   where id = p_return_id and user_id = auth.uid() and status = 'awaiting_payment';
end $$;

-- ---------- Row level security --------------------------------------
alter table public.profiles     enable row level security;
alter table public.fee_settings enable row level security;
alter table public.tds_returns  enable row level security;

drop policy if exists "profiles: own or admin read" on public.profiles;
create policy "profiles: own or admin read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: own update" on public.profiles;
create policy "profiles: own update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

drop policy if exists "fees: anyone read" on public.fee_settings;
create policy "fees: anyone read" on public.fee_settings for select using (true);

drop policy if exists "fees: admin update" on public.fee_settings;
create policy "fees: admin update" on public.fee_settings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "returns: own or admin read" on public.tds_returns;
create policy "returns: own or admin read" on public.tds_returns
  for select using (user_id = auth.uid() or public.is_admin());

-- Customers never update rows directly (only through the functions above).
drop policy if exists "returns: admin update" on public.tds_returns;
create policy "returns: admin update" on public.tds_returns
  for update using (public.is_admin()) with check (public.is_admin());

grant execute on function public.quote_fee(int) to anon, authenticated;
grant execute on function public.create_tds_return(text,text,text,text,text,text,int,text) to authenticated;
grant execute on function public.attach_tds_files(uuid,text,text,text) to authenticated;
grant execute on function public.delete_unpaid_return(uuid) to authenticated;

-- ---------- File storage --------------------------------------------
-- Private bucket. Paths: <user_id>/<return_id>/<file>
--   customer files:      <user_id>/<return_id>/fvu-..., form27a-..., extra-...
--   acknowledgement:     <user_id>/<return_id>/ack/...   (admin only)
insert into storage.buckets (id, name, public, file_size_limit)
values ('tds-files', 'tds-files', false, 26214400)  -- 25 MB per file
on conflict (id) do nothing;

drop policy if exists "tds-files: own read" on storage.objects;
create policy "tds-files: own read" on storage.objects for select
  using (bucket_id = 'tds-files'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "tds-files: own upload" on storage.objects;
create policy "tds-files: own upload" on storage.objects for insert
  with check (bucket_id = 'tds-files'
              and (storage.foldername(name))[1] = auth.uid()::text
              and coalesce((storage.foldername(name))[3], '') <> 'ack');

drop policy if exists "tds-files: admin upload" on storage.objects;
create policy "tds-files: admin upload" on storage.objects for insert
  with check (bucket_id = 'tds-files' and public.is_admin());

drop policy if exists "tds-files: admin update" on storage.objects;
create policy "tds-files: admin update" on storage.objects for update
  using (bucket_id = 'tds-files' and public.is_admin());

-- ---------- Make yourself admin -------------------------------------
-- After you sign up on the portal with your own email, run:
--   update public.profiles set is_admin = true where email = 'YOUR-EMAIL@example.com';
