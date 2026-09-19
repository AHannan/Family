-- Family Tree app: accounts roster + one row per family tree.
--
-- Runs against the `Family` project (ref agyxgjrodidtcybgvywu), which is this
-- app's own - it does not share `auth.users` with anything else. The `family_`
-- prefix is kept anyway: it costs nothing and it is what makes this file safe to
-- replay into a shared project if that is ever needed.
--
-- Two things shape the schema:
--
--  * There is no self-signup. A person asks to be let in, the owner creates
--    their row with the admin API and sends them a password out of band, so
--    `family_accounts` is written by service_role only - never by the app.
--  * The app stays local-first. localStorage is still the working copy and the
--    undo stack, and a tree's `people` array is stored here as one jsonb
--    document rather than normalised into rows. That keeps `repair()` and
--    `coerce()` in lib/family.ts the only code that understands the shape, and
--    it means a sync is one upsert per tree instead of a diff per person.

/* ---- the roster ------------------------------------------------------- */

create table if not exists public.family_accounts (
  id           uuid primary key references auth.users (id) on delete cascade,
  phone        text not null unique,
  display_name text,
  -- Turning this off locks somebody out without deleting their trees.
  is_active    boolean not null default true,
  -- Language and text size follow the person to a new device.
  settings     jsonb not null default '{"locale":"en","textScale":1}'::jsonb,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

comment on table public.family_accounts is
  'Provisioned users of the Family Tree app. Rows are created by the owner via the admin API; the app itself can only read its own row and update settings.';

/* ---- the trees -------------------------------------------------------- */

create table if not exists public.family_trees (
  -- A surrogate key, because `tree_id` is generated on the device and is only
  -- unique to that device. This is also what a public link points at.
  uid        uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  tree_id    text not null,
  name       text not null default 'Family',
  name_ur    text not null default '',
  note       text not null default '',
  root_id    text,
  focus_id   text,
  is_sample  boolean not null default false,
  -- Off unless the owner asks for it. See the anon read policy below.
  is_public  boolean not null default false,
  people     jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  -- The device's own timestamp for the tree, used to settle merges.
  updated_at timestamptz not null default now(),
  synced_at  timestamptz not null default now(),
  unique (owner_id, tree_id)
);

create index if not exists family_trees_owner_idx on public.family_trees (owner_id);
create index if not exists family_trees_public_idx on public.family_trees (uid) where is_public;

comment on column public.family_trees.people is
  'The tree''s people array verbatim, as lib/types.ts Person[]. Repaired by the client on read, never parsed by the database.';

/* ---- row level security ------------------------------------------------ */

alter table public.family_accounts enable row level security;
alter table public.family_trees    enable row level security;

-- Somebody may read their own roster row and nobody else's.
create policy family_accounts_select_own on public.family_accounts
  for select to authenticated using (id = auth.uid());

-- Only the settings are theirs to change; is_active and phone are the owner's.
create policy family_accounts_update_own on public.family_accounts
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- A signed-in person owns their trees outright.
create policy family_trees_all_own on public.family_trees
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- A tree the owner has marked public is readable by anyone with the link,
-- including visitors who are not signed in at all. Read only: there is no
-- insert, update or delete policy for anon.
create policy family_trees_select_public on public.family_trees
  for select to anon, authenticated using (is_public);

/* ---- keeping synced_at honest ----------------------------------------- */

create or replace function public.family_touch_synced_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

drop trigger if exists family_trees_synced_at on public.family_trees;
create trigger family_trees_synced_at
  before insert or update on public.family_trees
  for each row execute function public.family_touch_synced_at();

/* ---- who may write which columns --------------------------------------- */

-- Supabase grants `anon` and `authenticated` blanket table privileges by
-- default, so RLS is the only thing standing between a visitor and the data.
-- That is fine for family_trees, where every policy is `owner_id = auth.uid()`,
-- but not for the roster: RLS cannot restrict which *columns* an update touches,
-- and `is_active` is how access is revoked. Without this, the person being
-- locked out could simply switch themselves back on.
revoke update on public.family_accounts from authenticated;
grant update (settings, last_seen_at) on public.family_accounts to authenticated;

-- anon has no business in the roster at all, and may only read public trees.
revoke all on public.family_accounts from anon;
revoke insert, update, delete on public.family_trees from anon;
