-- ============================================================================
-- Functions and triggers
--   * updated_at maintenance
--   * Tamil Nadu-only pharmacy validation (district + PIN + polygon)
--   * inventory availability derived from quantity
--   * profile role / pharmacy owner immutability guards
--   * signup trigger that creates profile + optional pharmacy
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists pharmacies_set_updated_at on public.pharmacies;
create trigger pharmacies_set_updated_at
  before update on public.pharmacies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tamil Nadu district validation (mirrors src/data/tamilNadu.ts)
-- ---------------------------------------------------------------------------
create or replace function public.is_tamil_nadu_district(p_district text)
returns boolean
language sql
immutable
as $$
  select lower(btrim(coalesce(p_district, ''))) = any (array[
    'chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem',
    'tirunelveli', 'erode', 'vellore', 'thanjavur', 'chengalpattu',
    'tiruvallur', 'kanchipuram', 'dindigul', 'cuddalore', 'dharmapuri',
    'kallakurichi', 'kanyakumari', 'karur', 'krishnagiri', 'mayiladuthurai',
    'nagapattinam', 'namakkal', 'nilgiris', 'perambalur', 'pudukkottai',
    'ramanathapuram', 'ranipet', 'sivaganga', 'tenkasi', 'theni',
    'thoothukudi', 'tirupathur', 'tiruppur', 'tiruvannamalai', 'tiruvarur',
    'ariyalur', 'viluppuram', 'virudhunagar'
  ]);
$$;

-- Rejects any pharmacy that is outside Tamil Nadu's polygon, uses a district
-- outside the official 38, or has a non-Tamil-Nadu PIN code.
create or replace function public.validate_pharmacy_location()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is null or new.longitude is null then
    raise exception 'Pharmacy latitude and longitude are required.';
  end if;

  if not public.is_tamil_nadu_district(new.district) then
    raise exception 'District "%" is not one of the 38 official Tamil Nadu districts.', new.district;
  end if;

  if new.pin_code is not null and new.pin_code !~ '^6[0-9]{5}$' then
    raise exception 'PIN code must be a valid 6-digit Tamil Nadu postal code starting with 6.';
  end if;

  if not public.is_inside_tamil_nadu(new.latitude, new.longitude) then
    raise exception 'Pharmacy coordinates (%, %) are outside the Tamil Nadu boundary (or inside Puducherry/Karaikal). MediFind only accepts Tamil Nadu pharmacies.',
      new.latitude, new.longitude;
  end if;

  return new;
end;
$$;

drop trigger if exists pharmacies_validate_location on public.pharmacies;
create trigger pharmacies_validate_location
  before insert or update of latitude, longitude, district, pin_code
  on public.pharmacies
  for each row execute function public.validate_pharmacy_location();

-- ---------------------------------------------------------------------------
-- Inventory availability is always derived from quantity
-- ---------------------------------------------------------------------------
create or replace function public.apply_inventory_availability()
returns trigger
language plpgsql
as $$
begin
  new.stock_quantity := greatest(0, coalesce(new.stock_quantity, 0));

  new.availability_status := case
    when new.stock_quantity <= 0 then 'out_of_stock'
    when new.stock_quantity <= 10 then 'low_stock'
    else 'in_stock'
  end;

  new.last_updated := now();
  return new;
end;
$$;

drop trigger if exists inventory_apply_availability on public.inventory;
create trigger inventory_apply_availability
  before insert or update of stock_quantity
  on public.inventory
  for each row execute function public.apply_inventory_availability();

-- ---------------------------------------------------------------------------
-- Immutability guards
-- ---------------------------------------------------------------------------
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  -- auth.uid() is null for server-side/service-role work.
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Profile roles cannot be changed from the client.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

create or replace function public.prevent_pharmacy_owner_change()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is distinct from old.owner_id and auth.uid() is not null then
    raise exception 'A pharmacy cannot be transferred to another owner from the client.';
  end if;
  return new;
end;
$$;

drop trigger if exists pharmacies_prevent_owner_change on public.pharmacies;
create trigger pharmacies_prevent_owner_change
  before update on public.pharmacies
  for each row execute function public.prevent_pharmacy_owner_change();

-- ---------------------------------------------------------------------------
-- Signup trigger
-- Creates the profile row for every auth user, and creates the pharmacy row
-- when the registration metadata includes pharmacy details. SECURITY DEFINER
-- is required because the trigger runs before the user has a session.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_services text[];
begin
  v_role := case
    when v_meta ->> 'role' = 'pharmacy_owner' then 'pharmacy_owner'
    else 'customer'
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(v_meta ->> 'full_name', '')), ''),
    v_role
  )
  on conflict (id) do nothing;

  if v_role = 'pharmacy_owner'
     and nullif(btrim(coalesce(v_meta ->> 'pharmacy_name', '')), '') is not null
     and nullif(btrim(coalesce(v_meta ->> 'address', '')), '') is not null
     and nullif(btrim(coalesce(v_meta ->> 'district', '')), '') is not null
     and (v_meta ->> 'latitude') is not null
     and (v_meta ->> 'longitude') is not null then

    select coalesce(array_agg(t.value), '{}'::text[])
      into v_services
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(v_meta -> 'services') = 'array' then v_meta -> 'services'
          else '[]'::jsonb
        end
      ) as t(value);

    insert into public.pharmacies (
      owner_id,
      name,
      owner_name,
      address,
      area,
      district,
      pin_code,
      phone,
      emergency_phone,
      latitude,
      longitude,
      opening_hours,
      is_open_now,
      is_24_hours,
      services,
      is_approved,
      is_demo
    )
    values (
      new.id,
      btrim(v_meta ->> 'pharmacy_name'),
      nullif(btrim(coalesce(v_meta ->> 'owner_name', '')), ''),
      btrim(v_meta ->> 'address'),
      nullif(btrim(coalesce(v_meta ->> 'area', '')), ''),
      btrim(v_meta ->> 'district'),
      nullif(btrim(coalesce(v_meta ->> 'pin_code', '')), ''),
      btrim(coalesce(v_meta ->> 'phone', '')),
      nullif(btrim(coalesce(v_meta ->> 'emergency_phone', '')), ''),
      (v_meta ->> 'latitude')::double precision,
      (v_meta ->> 'longitude')::double precision,
      coalesce(nullif(btrim(coalesce(v_meta ->> 'opening_hours', '')), ''), '9:00 AM - 9:00 PM'),
      true,
      coalesce((v_meta ->> 'is_24_hours')::boolean, false),
      coalesce(v_services, '{}'::text[]),
      true,
      false
    )
    on conflict (owner_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
