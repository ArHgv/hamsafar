-- Run in the SQL Editor of a new Supabase project.
-- Data writes are RPC-only; RLS remains authoritative for reads and files.
begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  updated_at timestamptz not null default now()
);
create table if not exists public.trips (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.trip_memberships (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id text not null,
  role text not null check (role in ('viewer', 'planner', 'treasurer', 'admin')),
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id),
  unique (trip_id, member_id)
);
create table if not exists public.trip_invites (
  token uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  role text not null check (role in ('viewer', 'planner', 'treasurer', 'admin')),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists memberships_user_idx on public.trip_memberships(user_id, trip_id);
create index if not exists trips_owner_idx on public.trips(owner_id);
create index if not exists invites_trip_idx on public.trip_invites(trip_id, expires_at) where not revoked;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_memberships enable row level security;
alter table public.trip_invites enable row level security;

create or replace function public.get_trip_role(p_trip_id uuid)
returns text language sql stable security definer set search_path = public, pg_temp
as $$ select m.role from public.trip_memberships m where m.trip_id = p_trip_id and m.user_id = (select auth.uid()) $$;

create or replace function public.trip_can_edit(p_trip_id uuid, p_section text)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(
    public.get_trip_role(p_trip_id) = 'admin'
    or (public.get_trip_role(p_trip_id) = 'planner' and p_section in ('activities','checklist','locations','transport'))
    or (public.get_trip_role(p_trip_id) = 'treasurer' and p_section in ('expenses','settlements')),
    false
  )
$$;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists trips_members on public.trips;
create policy trips_members on public.trips for select to authenticated using (public.get_trip_role(id) is not null);
drop policy if exists memberships_members on public.trip_memberships;
create policy memberships_members on public.trip_memberships for select to authenticated using (public.get_trip_role(trip_id) is not null);
drop policy if exists invites_admin on public.trip_invites;
create policy invites_admin on public.trip_invites for select to authenticated using (public.get_trip_role(trip_id) = 'admin');

revoke all on public.profiles, public.trips, public.trip_memberships, public.trip_invites from anon, authenticated;
grant select on public.profiles, public.trips, public.trip_memberships, public.trip_invites to authenticated;

create or replace function public.handle_hamsafar_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), nullif(split_part(new.email, '@', 1), ''), 'هم‌سفر'), 150))
  on conflict (id) do update set name = excluded.name, updated_at = now();
  return new;
end;
$$;
drop trigger if exists hamsafar_profile_created on auth.users;
create trigger hamsafar_profile_created after insert on auth.users for each row execute function public.handle_hamsafar_profile();
drop trigger if exists hamsafar_profile_updated on auth.users;
create trigger hamsafar_profile_updated after update of raw_user_meta_data on auth.users for each row execute function public.handle_hamsafar_profile();
insert into public.profiles(id, name)
select id, left(coalesce(nullif(trim(raw_user_meta_data->>'name'), ''), nullif(split_part(email, '@', 1), ''), 'هم‌سفر'), 150) from auth.users
on conflict (id) do nothing;

create or replace function public.assert_trip_amount(p_value jsonb, p_min numeric, p_max numeric)
returns void language plpgsql immutable set search_path = public, pg_temp
as $$
declare n numeric;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'number' then raise exception 'INVALID_AMOUNT'; end if;
  n := p_value::text::numeric;
  if n <> trunc(n) or n < p_min or n > p_max then raise exception 'INVALID_AMOUNT'; end if;
end;
$$;

create or replace function public.assert_trip_attachment(p jsonb, p_trip_id text, p_scope text)
returns void language plpgsql immutable set search_path = public, pg_temp
as $$
begin
  if p_trip_id is null or p_scope is null or p_scope not in ('plan','expense') or jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'id') is distinct from 'string' or coalesce(char_length(p->>'id'),0) not between 1 and 100 or jsonb_typeof(p->'name') is distinct from 'string' or coalesce(char_length(trim(p->>'name')),0) not between 1 and 150 or coalesce(p->>'mime','') not in ('image/jpeg','image/png','image/webp','application/pdf') then raise exception 'INVALID_ATTACHMENT'; end if;
  perform public.assert_trip_amount(p->'size',0,10485760);
  if p ? 'cloudPath' and (jsonb_typeof(p->'cloudPath') <> 'string' or p->>'cloudPath' !~ ('^' || p_trip_id || '/' || p_scope || '/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$')) then raise exception 'INVALID_ATTACHMENT_PATH'; end if;
  if p ? 'localId' and (jsonb_typeof(p->'localId') <> 'string' or char_length(p->>'localId') not between 1 and 100) then raise exception 'INVALID_ATTACHMENT'; end if;
end;
$$;

create or replace function public.validate_trip_document(d jsonb)
returns void language plpgsql immutable set search_path = public, pg_temp
as $$
declare section text; item jsonb; share jsonb; first_date date; last_date date; total numeric; seen_ids text[]; seen_shares text[]; target text;
begin
  if d is null or jsonb_typeof(d) <> 'object' or octet_length(d::text) > 2097152 then raise exception 'INVALID_DOCUMENT'; end if;
  if jsonb_typeof(d->'title') is distinct from 'string' or jsonb_typeof(d->'destination') is distinct from 'string' then raise exception 'INVALID_TEXT_TYPE'; end if;
  if coalesce(char_length(trim(d->>'title')),0) not between 1 and 150 or coalesce(char_length(trim(d->>'destination')),0) not between 1 and 150 then raise exception 'INVALID_TITLE'; end if;
  if coalesce(d->>'currency','') not in ('IRT','IRR','USD','EUR') then raise exception 'INVALID_CURRENCY'; end if;
  if coalesce(d->>'startDate','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(d->>'endDate','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_DATE'; end if;
  first_date := (d->>'startDate')::date; last_date := (d->>'endDate')::date;
  if first_date < date '1900-01-01' or last_date > date '2200-12-31' or last_date < first_date or last_date - first_date > 365 then raise exception 'INVALID_DATE_RANGE'; end if;
  perform public.assert_trip_amount(d->'budget',0,1000000000000);
  if d ? 'description' and jsonb_typeof(d->'description') <> 'string' then raise exception 'INVALID_DESCRIPTION'; end if;
  if d ? 'archived' and jsonb_typeof(d->'archived') <> 'boolean' then raise exception 'INVALID_ARCHIVE'; end if;
  if coalesce(char_length(d->>'description'),0) > 3000 then raise exception 'INVALID_DESCRIPTION'; end if;
  if coalesce(char_length(d->>'cover'),0) > 650000 or not (coalesce(d->>'cover','') ~ '^/images/[a-z0-9-]+\.(jpg|png|webp)$' or coalesce(d->>'cover','') ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$') then raise exception 'INVALID_COVER'; end if;
  foreach section in array array['members','activities','checklist','expenses','settlements','locations'] loop
    if jsonb_typeof(d->section) is distinct from 'array' then raise exception 'INVALID_ARRAY'; end if;
    if jsonb_array_length(d->section) > (case when section = 'members' then 100 when section = 'locations' then 1000 when section in ('expenses','settlements') then 5000 else 2000 end) then raise exception 'LIMIT_EXCEEDED'; end if;
    seen_ids := array[]::text[];
    for item in select value from jsonb_array_elements(d->section) loop
      if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string' or coalesce(char_length(item->>'id'),0) not between 1 and 100 or item->>'id' = any(seen_ids) then raise exception 'INVALID_ENTITY_ID'; end if;
      seen_ids := array_append(seen_ids,item->>'id');
      if section = 'members' then
        if item ? 'email' and (jsonb_typeof(item->'email') <> 'string' or char_length(item->>'email') > 320 or (item->>'email' <> '' and (item->>'email' !~ '^[A-Za-z0-9_+''.-]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$' or item->>'email' like '.%' or position('..' in item->>'email') > 0))) then raise exception 'INVALID_EMAIL'; end if;
        if coalesce(char_length(trim(item->>'name')),0) not between 1 and 150 or coalesce(item->>'role','') not in ('viewer','planner','treasurer','admin') or coalesce(item->>'attendance','') not in ('confirmed','invited','maybe','declined') or coalesce(item->>'color','') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'INVALID_MEMBER'; end if;
      elsif section = 'activities' then
        if coalesce(char_length(trim(item->>'title')),0) not between 1 and 150 or coalesce(item->>'period','') not in ('morning','noon','afternoon','night') or coalesce(item->>'kind','') not in ('sight','food','experience','transport','rest') or coalesce(item->>'status','') not in ('pending','done','cancelled') then raise exception 'INVALID_ACTIVITY'; end if;
        perform public.assert_trip_amount(item->'duration',5,1440);
        if coalesce(item->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or (item->>'date')::date not between first_date and last_date then raise exception 'INVALID_ACTIVITY_DATE'; end if;
        if coalesce(item->>'time','') <> '' and item->>'time' !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise exception 'INVALID_TIME'; end if;
        if coalesce(item->>'locationId','') <> '' and not exists (select 1 from jsonb_array_elements(d->'locations') l where l->>'id' = item->>'locationId') then raise exception 'INVALID_LOCATION_REFERENCE'; end if;
      elsif section = 'checklist' then
        if coalesce(char_length(trim(item->>'name')),0) not between 1 and 150 or jsonb_typeof(item->'done') is distinct from 'boolean' or jsonb_typeof(item->'shared') is distinct from 'boolean' or coalesce(item->>'priority','') not in ('low','normal','high') or coalesce(item->>'category','') not in ('documents','clothing','electronics','medicine','food','hygiene','camping','photography','child','other') then raise exception 'INVALID_CHECKLIST'; end if;
        perform public.assert_trip_amount(item->'quantity',1,999);
        if item ? 'weight' and (jsonb_typeof(item->'weight') <> 'number' or (item->>'weight')::numeric not between 0 and 100000) then raise exception 'INVALID_WEIGHT'; end if;
        if coalesce(item->>'assignedTo','') <> '' and not exists (select 1 from jsonb_array_elements(d->'members') m where m->>'id' = item->>'assignedTo') then raise exception 'INVALID_MEMBER_REFERENCE'; end if;
      elsif section = 'locations' then
        if coalesce(char_length(trim(item->>'name')),0) not between 1 and 150 or coalesce(item->>'category','') not in ('stay','restaurant','airport','station','terminal','fuel','parking','hospital','atm','sight') or jsonb_typeof(item->'latitude') is distinct from 'number' or jsonb_typeof(item->'longitude') is distinct from 'number' then raise exception 'INVALID_LOCATION'; end if;
        if (item->>'latitude')::numeric not between -90 and 90 or (item->>'longitude')::numeric not between -180 and 180 then raise exception 'INVALID_COORDINATES'; end if;
        if item ? 'address' and jsonb_typeof(item->'address') <> 'string' then raise exception 'INVALID_ADDRESS'; end if;
        if coalesce(char_length(item->>'address'),0) > 3000 then raise exception 'INVALID_ADDRESS'; end if;
      elsif section = 'expenses' then
        if coalesce(char_length(trim(item->>'title')),0) not between 1 and 150 or coalesce(item->>'category','') not in ('transport','food','hotel','ticket','shopping','entertainment','fuel','other') or coalesce(item->>'splitMode','') not in ('equal','custom','percentage') then raise exception 'INVALID_EXPENSE'; end if;
        perform public.assert_trip_amount(item->'amount',1,1000000000000);
        if item ? 'receipt' then perform public.assert_trip_attachment(item->'receipt',d->>'id','expense'); end if;
        if coalesce(item->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_EXPENSE_DATE'; end if;
        if (item->>'date')::date not between date '1900-01-01' and date '2200-12-31' then raise exception 'INVALID_FINANCIAL_DATE'; end if;
        if not exists (select 1 from jsonb_array_elements(d->'members') m where m->>'id' = item->>'payerId') then raise exception 'INVALID_PAYER'; end if;
        if jsonb_typeof(item->'shares') is distinct from 'array' or jsonb_array_length(item->'shares') not between 1 and 100 then raise exception 'INVALID_SHARES'; end if;
        total := 0; seen_shares := array[]::text[];
        for share in select value from jsonb_array_elements(item->'shares') loop
          if jsonb_typeof(share->'memberId') is distinct from 'string' then raise exception 'INVALID_SHARE_MEMBER'; end if;
          target := share->>'memberId';
          if target is null or target = any(seen_shares) or not exists (select 1 from jsonb_array_elements(d->'members') m where m->>'id' = target) then raise exception 'INVALID_SHARE_MEMBER'; end if;
          seen_shares := array_append(seen_shares,target);
          perform public.assert_trip_amount(share->'amount',0,1000000000000); total := total + (share->>'amount')::numeric;
          if item->>'splitMode' = 'equal' and (share->>'amount')::numeric <> floor((item->>'amount')::numeric / jsonb_array_length(item->'shares')) + (case when array_length(seen_shares,1) <= mod((item->>'amount')::numeric,jsonb_array_length(item->'shares')) then 1 else 0 end) then raise exception 'INVALID_EQUAL_SPLIT'; end if;
          if item->>'splitMode' = 'percentage' then
            if jsonb_typeof(share->'percentage') is distinct from 'number' or (share->>'percentage')::numeric not between 0 and 100 or (share->>'percentage')::numeric <> round((share->>'percentage')::numeric,2) then raise exception 'INVALID_PERCENTAGE'; end if;
            if abs((share->>'amount')::numeric - floor((item->>'amount')::numeric * round((share->>'percentage')::numeric * 100) / 10000)) > 1 then raise exception 'INVALID_PERCENTAGE_SPLIT'; end if;
          end if;
        end loop;
        if total <> (item->>'amount')::numeric then raise exception 'SHARES_DO_NOT_MATCH'; end if;
        if item->>'splitMode' = 'percentage' and exists (
          with allocation as (
            select (s->>'amount')::numeric as actual, floor((item->>'amount')::numeric * (s->>'percentage')::numeric / 100) as whole,
              row_number() over (order by mod((item->>'amount')::numeric * (s->>'percentage')::numeric, 100) desc, ord) as rank,
              sum(floor((item->>'amount')::numeric * (s->>'percentage')::numeric / 100)) over () as floor_total
            from jsonb_array_elements(item->'shares') with ordinality as shares(s,ord)
          ) select 1 from allocation where actual <> whole + (case when rank <= (item->>'amount')::numeric - floor_total then 1 else 0 end)
        ) then raise exception 'INVALID_PERCENTAGE_SPLIT'; end if;
        if item->>'splitMode' = 'percentage' and (select sum(round((s->>'percentage')::numeric * 100)) from jsonb_array_elements(item->'shares') s) <> 10000 then raise exception 'PERCENTAGES_DO_NOT_MATCH'; end if;
      elsif section = 'settlements' then
        perform public.assert_trip_amount(item->'amount',1,1000000000000);
        if coalesce(item->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_SETTLEMENT_DATE'; end if;
        if (item->>'date')::date not between date '1900-01-01' and date '2200-12-31' then raise exception 'INVALID_FINANCIAL_DATE'; end if;
        if item->>'fromId' = item->>'toId' or not exists (select 1 from jsonb_array_elements(d->'members') m where m->>'id' = item->>'fromId') or not exists (select 1 from jsonb_array_elements(d->'members') m where m->>'id' = item->>'toId') then raise exception 'INVALID_SETTLEMENT_MEMBERS'; end if;
      end if;
      if section = 'expenses' and jsonb_typeof(item->'createdAt') is distinct from 'string' then raise exception 'INVALID_TIMESTAMP'; end if;
      foreach target in array array['payerId','fromId','toId','assignedTo','locationId'] loop
        if item ? target and jsonb_typeof(item->target) <> 'string' then raise exception 'INVALID_REFERENCE_TYPE'; end if;
      end loop;
      if section in ('members','checklist','locations') and jsonb_typeof(item->'name') is distinct from 'string' then raise exception 'INVALID_TEXT_TYPE'; end if;
      if section in ('activities','expenses') and jsonb_typeof(item->'title') is distinct from 'string' then raise exception 'INVALID_TEXT_TYPE'; end if;
      if item ? 'notes' and jsonb_typeof(item->'notes') <> 'string' then raise exception 'INVALID_NOTES'; end if;
      if coalesce(char_length(item->>'notes'),0) > 3000 then raise exception 'INVALID_NOTES'; end if;
    end loop;
  end loop;
  if (select coalesce(sum((x->>'amount')::numeric),0) from jsonb_array_elements((d->'expenses') || (d->'settlements')) x) > 10000000000000 then raise exception 'MONEY_TOTAL_LIMIT'; end if;
  if jsonb_array_length(d->'members') = 0 then raise exception 'NO_MEMBERS'; end if;
  if jsonb_typeof(d->'transport') is distinct from 'object' or coalesce(d->'transport'->>'mode','') not in ('car','plane','train','bus','mixed') then raise exception 'INVALID_TRANSPORT'; end if;
  foreach target in array array['vehiclePlate','route','stops'] loop
    if d->'transport' ? target and (jsonb_typeof(d->'transport'->target) <> 'string' or char_length(d->'transport'->>target) > 3000) then raise exception 'INVALID_TRANSPORT_TEXT'; end if;
  end loop;
  if d->'transport' ? 'fuelEstimate' and (jsonb_typeof(d->'transport'->'fuelEstimate') <> 'number' or (d->'transport'->>'fuelEstimate')::numeric not between 0 and 10000) then raise exception 'INVALID_FUEL'; end if;
  foreach section in array array['outbound','return'] loop
    item := d->'transport'->section;
    if jsonb_typeof(item) is distinct from 'object' then raise exception 'INVALID_JOURNEY'; end if;
    foreach target in array array['origin','destination','routeNumber','terminal','platform','notes'] loop
      if item ? target and (jsonb_typeof(item->target) <> 'string' or char_length(item->>target) > 3000) then raise exception 'INVALID_JOURNEY_TEXT'; end if;
    end loop;
    if item ? 'ticket' then perform public.assert_trip_attachment(item->'ticket',d->>'id','plan'); end if;
    foreach target in array array['departureTime','arrivalTime','checkinTime'] loop
      if coalesce(item->>target,'') <> '' and item->>target !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise exception 'INVALID_TIME'; end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.create_trip(p_data jsonb)
returns setof public.trips language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_id uuid; v_owner_member text; v_data jsonb; v_row public.trips;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_id := (p_data->>'id')::uuid;
  select * into v_row from public.trips where id = v_id;
  if found then
    if v_row.owner_id <> v_user then raise exception 'FORBIDDEN'; end if;
    return next v_row; return;
  end if;
  if (select count(*) from public.trips where owner_id = v_user) >= 100 then raise exception 'TRIP_LIMIT'; end if;
  select m->>'id' into v_owner_member from jsonb_array_elements(p_data->'members') m where m->>'userId' = v_user::text limit 1;
  if v_owner_member is null then raise exception 'OWNER_REQUIRED'; end if;
  v_data := jsonb_strip_nulls(p_data || jsonb_build_object('id',v_id::text,'ownerId',v_user::text,'updatedAt',now(),'createdAt',now()));
  v_data := jsonb_set(v_data,'{members}',(select jsonb_agg(case when m->>'id' = v_owner_member then m || jsonb_build_object('userId',v_user::text,'role','admin','attendance','confirmed') else m - 'userId' end) from jsonb_array_elements(v_data->'members') m));
  perform public.validate_trip_document(v_data);
  insert into public.trips(id,owner_id,data) values (v_id,v_user,v_data) returning * into v_row;
  insert into public.trip_memberships(trip_id,user_id,member_id,role) values (v_id,v_user,v_owner_member,'admin');
  return next v_row;
end;
$$;

create or replace function public.apply_trip_patch(p_trip_id uuid, p_expected_revision bigint, p_patch jsonb)
returns setof public.trips language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_row public.trips; v_data jsonb; key text; section text; m jsonb; normalized jsonb := '[]'::jsonb; bound public.trip_memberships;
begin
  if auth.uid() is null or public.get_trip_role(p_trip_id) is null then raise exception 'FORBIDDEN'; end if;
  select * into v_row from public.trips where id = p_trip_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_row.revision <> p_expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  if jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'INVALID_PATCH'; end if;
  for key in select jsonb_object_keys(p_patch) loop
    if key in ('title','destination','startDate','endDate','budget','currency','description','cover','archived') then section := 'info';
    elsif key in ('members','activities','checklist','expenses','settlements','locations','transport') then section := key;
    else raise exception 'FORBIDDEN_KEY'; end if;
    if not public.trip_can_edit(p_trip_id,section) then raise exception 'FORBIDDEN'; end if;
  end loop;
  if p_patch ? 'currency' and p_patch->>'currency' <> v_row.data->>'currency' and (jsonb_array_length(v_row.data->'expenses') > 0 or jsonb_array_length(v_row.data->'settlements') > 0) then raise exception 'CURRENCY_LOCKED'; end if;
  v_data := jsonb_strip_nulls(v_row.data || p_patch || jsonb_build_object('updatedAt',now()));
  if p_patch ? 'members' then
    if not exists (select 1 from jsonb_array_elements(v_data->'members') x join public.trip_memberships tm on tm.trip_id = p_trip_id and tm.member_id = x->>'id' where tm.user_id = v_row.owner_id) then raise exception 'OWNER_REMOVE'; end if;
    for m in select value from jsonb_array_elements(v_data->'members') loop
      select * into bound from public.trip_memberships where trip_id = p_trip_id and member_id = m->>'id';
      if found then
        m := m || jsonb_build_object('userId',bound.user_id::text);
        if bound.user_id = v_row.owner_id then m := m || jsonb_build_object('role','admin'); end if;
      else m := m - 'userId'; end if;
      normalized := normalized || jsonb_build_array(m);
    end loop;
    v_data := jsonb_set(v_data,'{members}',normalized);
  end if;
  perform public.validate_trip_document(v_data);
  if p_patch ? 'members' then
    update public.trip_memberships tm set role = x.value->>'role'
    from jsonb_array_elements(v_data->'members') x(value) where tm.trip_id = p_trip_id and tm.member_id = x.value->>'id';
    delete from public.trip_memberships tm where tm.trip_id = p_trip_id and not exists (select 1 from jsonb_array_elements(v_data->'members') x where x->>'id' = tm.member_id);
  end if;
  update public.trips set data = v_data, revision = revision + 1, updated_at = now() where id = p_trip_id returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.create_invite(p_trip_id uuid, p_role text)
returns table(token uuid, role text, expires_at timestamptz) language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if public.get_trip_role(p_trip_id) is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('viewer','planner','treasurer','admin') then raise exception 'INVALID_ROLE'; end if;
  if (select count(*) from public.trip_invites i where i.trip_id = p_trip_id and not i.revoked and i.expires_at > now()) >= 20 then raise exception 'INVITE_LIMIT'; end if;
  return query insert into public.trip_invites(trip_id,role,created_by) values (p_trip_id,p_role,auth.uid()) returning trip_invites.token, trip_invites.role, trip_invites.expires_at;
end;
$$;

create or replace function public.invite_preview(p_token uuid)
returns table(title text, destination text, role text, inviter text, start_date text, end_date text)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  return query select t.data->>'title', t.data->>'destination', i.role, coalesce(p.name,'یک هم‌سفر'), t.data->>'startDate', t.data->>'endDate'
  from public.trip_invites i join public.trips t on t.id = i.trip_id left join public.profiles p on p.id = i.created_by
  where i.token = p_token and not i.revoked and i.expires_at > now();
end;
$$;

create or replace function public.join_trip(p_token uuid)
returns setof public.trips language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); invite public.trip_invites; v_row public.trips; email text; display_name text; verified_at timestamptz; existing jsonb; member jsonb; v_member_id text; member_list jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into invite from public.trip_invites where token = p_token for update;
  if not found or invite.revoked or invite.expires_at <= now() then raise exception 'INVALID_INVITE'; end if;
  select * into v_row from public.trips where id = invite.trip_id for update;
  if public.get_trip_role(invite.trip_id) is not null then return next v_row; return; end if;
  select u.email, coalesce(nullif(p.name,''), nullif(split_part(u.email,'@',1),''),'هم‌سفر'), u.email_confirmed_at into email, display_name, verified_at from auth.users u left join public.profiles p on p.id = u.id where u.id = v_user;
  if verified_at is null then raise exception 'EMAIL_NOT_CONFIRMED'; end if;
  -- Only a verified account with the matching email can claim an existing placeholder.
  select m into existing from jsonb_array_elements(v_row.data->'members') m
  where nullif(lower(m->>'email'),'') = lower(email) and not exists (select 1 from public.trip_memberships tm where tm.trip_id = invite.trip_id and tm.member_id = m->>'id') limit 1;
  if existing is null and jsonb_array_length(v_row.data->'members') >= 100 then raise exception 'MEMBER_LIMIT'; end if;
  v_member_id := coalesce(existing->>'id',gen_random_uuid()::text);
  member := coalesce(existing,'{}'::jsonb) || jsonb_build_object('id',v_member_id,'name',left(display_name,150),'email',email,'userId',v_user::text,'role',invite.role,'attendance','confirmed','color',coalesce(existing->>'color','#b9c6a3'));
  if existing is null then member_list := v_row.data->'members' || jsonb_build_array(member);
  else select jsonb_agg(case when m->>'id' = v_member_id then member else m end) into member_list from jsonb_array_elements(v_row.data->'members') m; end if;
  insert into public.trip_memberships(trip_id,user_id,member_id,role) values(invite.trip_id,v_user,v_member_id,invite.role);
  update public.trips set data = jsonb_set(data,'{members}',member_list) || jsonb_build_object('updatedAt',now()), revision = revision + 1, updated_at = now() where id = invite.trip_id returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.revoke_invite(p_token uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare trip_id uuid;
begin
  select i.trip_id into trip_id from public.trip_invites i where i.token = p_token;
  if public.get_trip_role(trip_id) is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;
  update public.trip_invites set revoked = true where token = p_token;
end;
$$;

create or replace function public.delete_trip(p_trip_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if public.get_trip_role(p_trip_id) is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;
  delete from public.trips where id = p_trip_id;
end;
$$;

-- Private storage: viewers can read; planning and finance files follow their respective roles.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('trip-files','trip-files',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_trip_id(p_path text)
returns uuid language plpgsql immutable set search_path = public, pg_temp
as $$
declare part text := split_part(p_path,'/',1);
begin
  if part ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return part::uuid; end if;
  return null;
end;
$$;
create or replace function public.storage_trip_can_write(p_path text)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select (p_path ~ '^[0-9a-fA-F-]{36}/(plan|expense)/[0-9a-fA-F-]{36}\.(pdf|jpg|png|webp)$') and case split_part(p_path,'/',2) when 'plan' then public.trip_can_edit(public.storage_trip_id(p_path),'transport') when 'expense' then public.trip_can_edit(public.storage_trip_id(p_path),'expenses') else false end $$;

drop policy if exists hamsafar_files_read on storage.objects;
create policy hamsafar_files_read on storage.objects for select to authenticated using (bucket_id = 'trip-files' and public.get_trip_role(public.storage_trip_id(name)) is not null);
drop policy if exists hamsafar_files_insert on storage.objects;
create policy hamsafar_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'trip-files' and public.storage_trip_can_write(name));
drop policy if exists hamsafar_files_update on storage.objects;
create policy hamsafar_files_update on storage.objects for update to authenticated using (bucket_id = 'trip-files' and public.storage_trip_can_write(name)) with check (bucket_id = 'trip-files' and public.storage_trip_can_write(name));
drop policy if exists hamsafar_files_delete on storage.objects;
create policy hamsafar_files_delete on storage.objects for delete to authenticated using (bucket_id = 'trip-files' and public.storage_trip_can_write(name));

create or replace function public.presence_trip_id(p_topic text)
returns uuid language sql immutable set search_path = public, pg_temp
as $$ select case when split_part(p_topic,':',1) = 'trip' then public.storage_trip_id(split_part(p_topic,':',2)) else null end $$;
-- Supabase private-channel authorization; no simulated presence in local mode.
drop policy if exists hamsafar_presence_read on realtime.messages;
create policy hamsafar_presence_read on realtime.messages for select to authenticated using (extension in ('presence','broadcast') and public.get_trip_role(public.presence_trip_id(realtime.topic())) is not null);
drop policy if exists hamsafar_presence_write on realtime.messages;
create policy hamsafar_presence_write on realtime.messages for insert to authenticated with check (extension in ('presence','broadcast') and public.get_trip_role(public.presence_trip_id(realtime.topic())) is not null);

revoke execute on function public.handle_hamsafar_profile() from public, anon, authenticated;
revoke execute on function public.assert_trip_attachment(jsonb,text,text) from public, anon, authenticated;
revoke execute on function public.assert_trip_amount(jsonb,numeric,numeric) from public, anon, authenticated;
revoke execute on function public.validate_trip_document(jsonb) from public, anon, authenticated;
revoke execute on function public.get_trip_role(uuid) from public, anon;
revoke execute on function public.trip_can_edit(uuid,text) from public, anon;
revoke execute on function public.create_trip(jsonb) from public, anon;
revoke execute on function public.apply_trip_patch(uuid,bigint,jsonb) from public, anon;
revoke execute on function public.create_invite(uuid,text) from public, anon;
revoke execute on function public.invite_preview(uuid) from public;
revoke execute on function public.join_trip(uuid) from public, anon;
revoke execute on function public.revoke_invite(uuid) from public, anon;
revoke execute on function public.delete_trip(uuid) from public, anon;
revoke execute on function public.storage_trip_id(text) from public, anon;
revoke execute on function public.storage_trip_can_write(text) from public, anon;
revoke execute on function public.presence_trip_id(text) from public, anon;
grant execute on function public.get_trip_role(uuid), public.trip_can_edit(uuid,text), public.create_trip(jsonb), public.apply_trip_patch(uuid,bigint,jsonb), public.create_invite(uuid,text), public.join_trip(uuid), public.revoke_invite(uuid), public.delete_trip(uuid), public.storage_trip_id(text), public.storage_trip_can_write(text), public.presence_trip_id(text) to authenticated;
grant execute on function public.invite_preview(uuid) to anon, authenticated;

-- Replica identity DEFAULT intentionally limits old-record disclosure on deletes.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trips') then alter publication supabase_realtime add table public.trips; end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_memberships') then alter publication supabase_realtime add table public.trip_memberships; end if;
  end if;
end;
$$;
commit;
