-- Recetas schema. Single-user app; access is gated by the app passphrase,
-- so we do not use row-level security. All DB access is server-side.

create extension if not exists "pgcrypto";

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text,
  type text,
  language text default 'es',
  porciones text,
  fridge_life_days int,
  rating int check (rating between 1 and 5),
  tried boolean not null default false,
  times_cooked int not null default 0,        -- legacy; superseded by cook_status
  cook_status text not null default 'sin_probar',  -- 'sin_probar' | 'cocinada' | 'cabecera'
  last_cooked date,
  source_url text,
  image_url text,
  video_url text,                            -- YouTube (embedded inline) or Instagram (linked out)
  ingredients jsonb not null default '[]',  -- [{label: string|null, items: string[]}]
  steps jsonb not null default '[]',         -- [{label: string|null, items: string[]}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_notes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists recipe_collections (
  recipe_id uuid not null references recipes(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  primary key (recipe_id, collection_id)
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists recipe_tags (
  recipe_id uuid not null references recipes(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  week_of date,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  position int not null default 0
);

-- Free-text cook tasks for the week that are not recipes (e.g. "cortar melón").
create table if not exists plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  text text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists staples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_qty text,
  aisle text,
  active boolean not null default true
);

create table if not exists on_hand (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  name text not null
);

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  name text not null,
  aisle text,
  qty text,
  checked boolean not null default false,
  source text check (source in ('recipe', 'staple', 'manual'))
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

create index if not exists recipes_type_idx on recipes(type);
create index if not exists plan_items_plan_idx on plan_items(plan_id);

-- Seed: starter collections
insert into collections (name) values ('Semanal'), ('Personal'), ('Thanksgiving')
  on conflict (name) do nothing;

-- Seed: type -> emoji map and aisle list
insert into settings (key, value) values
  ('emoji_map', '{"Aves":"🍗","Carne":"🥩","Pescado":"🐟","Leguminosas":"🫘","Ensalada":"🥗","Sopa/Curry":"🍲","Granos/Pasta":"🍚","Verduras":"🥦","Postre":"🍮","Desayuno":"🥣","Pan/Masa":"🫓","Salsas/Dips":"🫙","Untables":"🥜"}'::jsonb),
  ('aisles', '["Verduras y fruta","Despensa","Proteína","Lácteos","Congelados","Otros"]'::jsonb)
  on conflict (key) do nothing;
