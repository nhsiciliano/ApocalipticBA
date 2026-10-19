-- Local seed data (applied by `supabase db reset` after the migrations).

insert into public.scenarios (slug, name, "order", is_active) values
  ('constitucion', 'Constitución', 1, true),
  ('linea-c', 'Línea C', 2, false);

-- Placeholder balance; tuned during Fase 1. Units: damage in HP, reloadMs in ms, spread in
-- degrees, range in meters.
insert into public.weapons (slug, name, base_stats) values
  ('pistola', 'Pistola', '{
    "damage": 34,
    "headshotMultiplier": 2.5,
    "magazine": 12,
    "reloadMs": 1400,
    "spreadDeg": 1.5,
    "rangeM": 40
  }'::jsonb),
  ('escopeta', 'Escopeta', '{
    "damage": 14,
    "pellets": 8,
    "headshotMultiplier": 1.5,
    "magazine": 6,
    "reloadMs": 2800,
    "spreadDeg": 7,
    "rangeM": 15
  }'::jsonb);

insert into public.remote_config (key, value, platform, min_app_version) values
  ('min_app_version', '"0.1.0"'::jsonb, 'all', null),
  ('feature_flags', '{"ranking": false, "cloudSave": false}'::jsonb, 'all', null),
  ('balance.zombies', '{
    "comun": {"health": 100, "headshotMultiplier": 3, "walkSpeed": 1.2, "chaseSpeed": 2.2},
    "corredor": {"health": 55, "headshotMultiplier": 3, "walkSpeed": 2.0, "chaseSpeed": 5.5}
  }'::jsonb, 'all', null);
