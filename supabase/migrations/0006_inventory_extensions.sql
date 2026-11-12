-- ============================================================================
-- MediFind incremental upgrade: inventory expiry, low-stock thresholds and
-- stock update history.
--
-- This migration is additive and non-destructive. It does NOT drop or recreate
-- any existing table, and it keeps every existing inventory row.
--
-- Apply this AFTER 0001-0005. Run it once in the Supabase SQL editor
-- (or `supabase db push`).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- New inventory columns
-- ---------------------------------------------------------------------------
alter table public.inventory
  add column if not exists expiry_date date,
  add column if not exists low_stock_threshold integer not null default 10
    check (low_stock_threshold >= 0),
  add column if not exists last_change_source text not null default 'manual'
    check (last_change_source in ('manual', 'csv_import', 'system'));

comment on column public.inventory.expiry_date is
  'Optional medicine expiry date. Expired rows stay visible to the owner but are never shown as available to customers.';
comment on column public.inventory.low_stock_threshold is
  'Owner-configurable quantity at or below which the medicine is classified as low stock.';
comment on column public.inventory.last_change_source is
  'How the latest stock change was made. Written by the application, copied into inventory_history.';

-- ---------------------------------------------------------------------------
-- Keep availability_status and last_updated consistent on the server.
-- Availability classification is derived, never trusted from the client.
-- ---------------------------------------------------------------------------
create or replace function public.sync_inventory_status()
returns trigger
language plpgsql
as $$
begin
  new.availability_status := case
    when new.stock_quantity <= 0 then 'out_of_stock'
    when new.stock_quantity <= coalesce(new.low_stock_threshold, 10) then 'low_stock'
    else 'in_stock'
  end;

  if tg_op = 'UPDATE'
     and (
       new.stock_quantity is distinct from old.stock_quantity
       or new.expiry_date is distinct from old.expiry_date
       or new.low_stock_threshold is distinct from old.low_stock_threshold
     ) then
    new.last_updated := now();
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_sync_status on public.inventory;
create trigger inventory_sync_status
  before insert or update on public.inventory
  for each row execute function public.sync_inventory_status();

-- ---------------------------------------------------------------------------
-- Inventory change history
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_history (
  id                uuid primary key default gen_random_uuid(),
  inventory_id      uuid not null references public.inventory (id) on delete cascade,
  pharmacy_id       uuid not null references public.pharmacies (id) on delete cascade,
  medicine_id       uuid not null references public.medicines (id) on delete cascade,
  old_quantity      integer,
  new_quantity      integer,
  old_expiry_date   date,
  new_expiry_date   date,
  change_source     text not null default 'manual'
                    check (change_source in ('manual', 'csv_import', 'system')),
  changed_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);

comment on table public.inventory_history is
  'Append-only stock/expiry change log. Owners can read only their own pharmacy history.';

create index if not exists inventory_history_pharmacy_idx
  on public.inventory_history (pharmacy_id, created_at desc);
create index if not exists inventory_history_inventory_idx
  on public.inventory_history (inventory_id, created_at desc);

create or replace function public.log_inventory_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.inventory_history (
      inventory_id, pharmacy_id, medicine_id,
      old_quantity, new_quantity, old_expiry_date, new_expiry_date,
      change_source, changed_by
    ) values (
      new.id, new.pharmacy_id, new.medicine_id,
      null, new.stock_quantity, null, new.expiry_date,
      coalesce(new.last_change_source, 'manual'), auth.uid()
    );
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (
       new.stock_quantity is distinct from old.stock_quantity
       or new.expiry_date is distinct from old.expiry_date
     ) then
    insert into public.inventory_history (
      inventory_id, pharmacy_id, medicine_id,
      old_quantity, new_quantity, old_expiry_date, new_expiry_date,
      change_source, changed_by
    ) values (
      new.id, new.pharmacy_id, new.medicine_id,
      old.stock_quantity, new.stock_quantity, old.expiry_date, new.expiry_date,
      coalesce(new.last_change_source, 'manual'), auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_log_history on public.inventory;
create trigger inventory_log_history
  after insert or update on public.inventory
  for each row execute function public.log_inventory_change();

-- ---------------------------------------------------------------------------
-- Recalculate availability for existing rows WITHOUT changing last_updated.
-- ---------------------------------------------------------------------------
update public.inventory
   set availability_status = case
     when stock_quantity <= 0 then 'out_of_stock'
     when stock_quantity <= coalesce(low_stock_threshold, 10) then 'low_stock'
     else 'in_stock'
   end
 where availability_status is distinct from (
   case
     when stock_quantity <= 0 then 'out_of_stock'
     when stock_quantity <= coalesce(low_stock_threshold, 10) then 'low_stock'
     else 'in_stock'
   end
 );

-- ---------------------------------------------------------------------------
-- Indexes for expiry and recent-update queries
-- ---------------------------------------------------------------------------
create index if not exists inventory_expiry_idx
  on public.inventory (expiry_date);
create index if not exists inventory_last_updated_idx
  on public.inventory (last_updated desc);

-- ---------------------------------------------------------------------------
-- RLS for inventory_history (append-only, owner read-only)
-- ---------------------------------------------------------------------------
alter table public.inventory_history enable row level security;
grant select on public.inventory_history to authenticated;

drop policy if exists inventory_history_owner_read on public.inventory_history;
create policy inventory_history_owner_read
  on public.inventory_history for select
  to authenticated
  using (
    exists (
      select 1
        from public.pharmacies p
       where p.id = inventory_history.pharmacy_id
         and p.owner_id = auth.uid()
    )
  );
