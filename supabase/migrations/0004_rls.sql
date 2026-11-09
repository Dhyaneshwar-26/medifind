-- ============================================================================
-- Row Level Security
--
-- Public (anon) customers can read only approved pharmacies, the medicine
-- catalogue, and inventory belonging to approved pharmacies. Pharmacy owners
-- can read/write only their own pharmacy and its inventory. Profiles are
-- private to their owner. Role changes and pharmacy transfers are blocked by
-- the triggers in 0003_functions_triggers.sql.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.pharmacies enable row level security;
alter table public.medicines enable row level security;
alter table public.inventory enable row level security;
alter table public.tamil_nadu_boundary enable row level security;

-- ---------------------------------------------------------------------------
-- Base table privileges (RLS still filters rows)
-- ---------------------------------------------------------------------------
grant select on public.pharmacies to anon, authenticated;
grant insert, update, delete on public.pharmacies to authenticated;

grant select on public.medicines to anon, authenticated;
grant insert, update, delete on public.medicines to authenticated;

grant select on public.inventory to anon, authenticated;
grant insert, update, delete on public.inventory to authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select on public.tamil_nadu_boundary to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_insert_own_customer on public.profiles;
create policy profiles_insert_own_customer
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id and role = 'customer');

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- pharmacies
-- ---------------------------------------------------------------------------
drop policy if exists pharmacies_public_read_approved on public.pharmacies;
create policy pharmacies_public_read_approved
  on public.pharmacies for select
  to anon, authenticated
  using (is_approved = true or owner_id = auth.uid());

-- A signed-in user may only create/manage a pharmacy when they own it AND their
-- profile has the pharmacy_owner role. The role itself cannot be escalated from
-- the client (see the trigger in 0003_functions_triggers.sql).
drop policy if exists pharmacies_owner_insert on public.pharmacies;
create policy pharmacies_owner_insert
  on public.pharmacies for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'pharmacy_owner'
    )
  );

drop policy if exists pharmacies_owner_update on public.pharmacies;
create policy pharmacies_owner_update
  on public.pharmacies for update
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'pharmacy_owner'
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'pharmacy_owner'
    )
  );

drop policy if exists pharmacies_owner_delete on public.pharmacies;
create policy pharmacies_owner_delete
  on public.pharmacies for delete
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'pharmacy_owner'
    )
  );

-- ---------------------------------------------------------------------------
-- medicines
-- ---------------------------------------------------------------------------
drop policy if exists medicines_public_read on public.medicines;
create policy medicines_public_read
  on public.medicines for select
  to anon, authenticated
  using (true);

drop policy if exists medicines_owner_insert on public.medicines;
create policy medicines_owner_insert
  on public.medicines for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'pharmacy_owner'
    )
  );

drop policy if exists medicines_owner_update on public.medicines;
create policy medicines_owner_update
  on public.medicines for update
  to authenticated
  using (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'pharmacy_owner'
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'pharmacy_owner'
    )
  );

drop policy if exists medicines_owner_delete on public.medicines;
create policy medicines_owner_delete
  on public.medicines for delete
  to authenticated
  using (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'pharmacy_owner'
    )
  );

-- ---------------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------------
drop policy if exists inventory_public_read on public.inventory;
create policy inventory_public_read
  on public.inventory for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.pharmacies p
       where p.id = inventory.pharmacy_id
         and (p.is_approved = true or p.owner_id = auth.uid())
    )
  );

drop policy if exists inventory_owner_insert on public.inventory;
create policy inventory_owner_insert
  on public.inventory for insert
  to authenticated
  with check (
    exists (
      select 1
        from public.pharmacies p
       where p.id = inventory.pharmacy_id
         and p.owner_id = auth.uid()
    )
  );

drop policy if exists inventory_owner_update on public.inventory;
create policy inventory_owner_update
  on public.inventory for update
  to authenticated
  using (
    exists (
      select 1
        from public.pharmacies p
       where p.id = inventory.pharmacy_id
         and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from public.pharmacies p
       where p.id = inventory.pharmacy_id
         and p.owner_id = auth.uid()
    )
  );

drop policy if exists inventory_owner_delete on public.inventory;
create policy inventory_owner_delete
  on public.inventory for delete
  to authenticated
  using (
    exists (
      select 1
        from public.pharmacies p
       where p.id = inventory.pharmacy_id
         and p.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- boundary reference data (read-only to clients)
-- ---------------------------------------------------------------------------
drop policy if exists boundary_public_read on public.tamil_nadu_boundary;
create policy boundary_public_read
  on public.tamil_nadu_boundary for select
  to anon, authenticated
  using (true);
