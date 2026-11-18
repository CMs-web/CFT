-- Run: psql "$DATABASE_URL" -f seed.sql
-- There is no create-user API, so these are the three test users.

INSERT INTO users (id, name) VALUES
  ('user_alice', 'Alice'),
  ('user_bob',   'Bob'),
  ('user_carol', 'Carol')
ON CONFLICT (id) DO NOTHING;
