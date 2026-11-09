-- ============================================================================
-- MediFind schema
-- Run this migration first in the Supabase SQL editor (or via `supabase db push`).
--
-- Tables:
--   profiles   -> one row per Supabase auth user (customer or pharmacy owner)
--   pharmacies -> one row per registered pharmacy owner
--   medicines  -> shared catalogue plus owner-created custom medicines
--   inventory  -> pharmacy-specific stock for a catalogue medicine
--
-- Relationship summary:
--   auth.users 1─1 profiles
--   profiles   1─1 pharmacies        (enforced by unique owner_id)
--   pharmacies 1─* inventory
--   medicines  1─* inventory
--   inventory is unique per (pharmacy_id, medicine_id)
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'customer'
              check (role in ('pharmacy_owner', 'customer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for each Supabase auth user. The signup trigger creates this row.';

-- ---------------------------------------------------------------------------
-- pharmacies
-- ---------------------------------------------------------------------------
create table if not exists public.pharmacies (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null unique references public.profiles (id) on delete cascade,
  name            text not null check (btrim(name) <> ''),
  owner_name      text,
  address         text not null check (btrim(address) <> ''),
  area            text not null default '' check (btrim(area) <> ''),
  district        text not null check (btrim(district) <> ''),
  pin_code        text check (pin_code is null or pin_code ~ '^6[0-9]{5}$'),
  phone           text not null check (btrim(phone) <> ''),
  emergency_phone text,
  latitude        double precision not null check (latitude between -90 and 90),
  longitude       double precision not null check (longitude between -180 and 180),
  opening_hours   text not null default '9:00 AM - 9:00 PM',
  is_open_now     boolean not null default true,
  is_24_hours     boolean not null default false,
  services        text[] not null default '{}',
  rating          numeric(2, 1) not null default 0 check (rating between 0 and 5),
  review_count    integer not null default 0 check (review_count >= 0),
  image_url       text,
  is_approved     boolean not null default true,
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.pharmacies is
  'Registered Tamil Nadu pharmacy storefronts. Exactly one pharmacy per owner.';
comment on column public.pharmacies.is_demo is
  'True only for clearly-labelled fictional demo data. Never present demo rows as verified.';
comment on column public.pharmacies.is_approved is
  'Moderation flag. Public customer search only returns approved pharmacies.';

create index if not exists pharmacies_district_idx
  on public.pharmacies (district);
create index if not exists pharmacies_approved_idx
  on public.pharmacies (is_approved);
create index if not exists pharmacies_location_idx
  on public.pharmacies (latitude, longitude);

-- ---------------------------------------------------------------------------
-- medicines (shared catalogue + custom owner entries)
-- ---------------------------------------------------------------------------
create table if not exists public.medicines (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (btrim(name) <> ''),
  generic_name          text,
  category              text not null default 'General' check (btrim(category) <> ''),
  strength              text,
  dosage_form           text,
  prescription_required boolean not null default false,
  default_price         text,
  is_sample             boolean not null default false,
  created_by            uuid references public.profiles (id) on delete set null,
  -- Generated key makes name + strength unique regardless of case/spacing.
  catalog_key           text generated always as (
                          lower(btrim(name)) || '|' || lower(btrim(coalesce(strength, '')))
                        ) stored,
  created_at            timestamptz not null default now(),
  constraint medicines_catalog_key_unique unique (catalog_key)
);

comment on table public.medicines is
  'Shared medicine catalogue. Rows with created_by = null are the seeded reference catalogue.';
comment on column public.medicines.is_sample is
  'Marks seeded/sample catalogue records that must never be shown as verified real-world stock.';
comment on column public.medicines.created_by is
  'Owner who created a custom medicine. Null for the shared seeded catalogue.';

create index if not exists medicines_name_idx
  on public.medicines (lower(name));
create index if not exists medicines_generic_idx
  on public.medicines (lower(generic_name));
create index if not exists medicines_category_idx
  on public.medicines (lower(category));

-- ---------------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------------
create table if not exists public.inventory (
  id                  uuid primary key default gen_random_uuid(),
  pharmacy_id         uuid not null references public.pharmacies (id) on delete cascade,
  medicine_id         uuid not null references public.medicines (id) on delete restrict,
  stock_quantity      integer not null default 0 check (stock_quantity >= 0),
  availability_status text not null default 'out_of_stock'
                      check (availability_status in ('in_stock', 'low_stock', 'out_of_stock')),
  price               text,
  last_updated        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint inventory_unique_medicine_per_pharmacy unique (pharmacy_id, medicine_id)
);

comment on table public.inventory is
  'Per-pharmacy stock. One row per pharmacy + medicine; availability is derived from quantity.';

create index if not exists inventory_pharmacy_idx
  on public.inventory (pharmacy_id);
create index if not exists inventory_medicine_idx
  on public.inventory (medicine_id);
create index if not exists inventory_status_idx
  on public.inventory (availability_status);
