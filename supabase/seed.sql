-- ============================================================
-- Circulate — Seed Data
-- Safe to run repeatedly (idempotent via ON CONFLICT).
-- Run after 0001 + 0002.
-- ============================================================

-- ---------- platform reserve wallet ----------
-- Single, platform-owned wallet that collects the 6% transaction fee.
insert into public.wallets (id, user_id, balance, is_reserve)
values ('00000000-0000-0000-0000-000000000001', null, 0, true)
on conflict (id) do nothing;

-- ---------- categories ----------
insert into public.categories (name, slug, sort_order) values
  ('Electronics',        'electronics',        10),
  ('Furniture',          'furniture',          20),
  ('Clothing',           'clothing',           30),
  ('Home & Garden',      'home-garden',        40),
  ('Books & Media',      'books-media',        50),
  ('Toys & Games',       'toys-games',         60),
  ('Sports & Outdoors',  'sports-outdoors',    70),
  ('Tools',              'tools',              80),
  ('Tutoring',           'tutoring',           90),
  ('Home Services',      'home-services',      100),
  ('Creative & Design',  'creative-design',    110),
  ('Other',              'other',              999)
on conflict (slug) do nothing;

-- ---------- locations ----------
insert into public.locations (name, slug, sort_order) values
  ('Downtown',     'downtown',      10),
  ('North Side',   'north-side',    20),
  ('South Side',   'south-side',    30),
  ('East Side',    'east-side',     40),
  ('West Side',    'west-side',     50),
  ('Suburbs',      'suburbs',       60),
  ('Other',        'other',         999)
on conflict (slug) do nothing;

-- ---------- conditions ----------
insert into public.conditions (name, slug, sort_order) values
  ('New',             'new',             10),
  ('Like New',        'like-new',        20),
  ('Good',            'good',            30),
  ('Fair',            'fair',            40),
  ('For Parts',       'for-parts',       50),
  ('Not Applicable',  'not-applicable',  999)
on conflict (slug) do nothing;
