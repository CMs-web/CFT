-- Recompute direct_key for databases created before the collision-safe format.
-- Run once with: psql "$DATABASE_URL" -f migrations/001_direct_key.sql

BEGIN;

-- Clear old keys first so a recomputed key cannot collide with an old value.
-- The unique constraint permits multiple NULL values.
UPDATE chats
SET direct_key = NULL
WHERE type = 'direct';

WITH direct_pairs AS (
  SELECT c.id,
         (array_agg(cm.user_id ORDER BY cm.user_id COLLATE "C"))[1] AS first_user,
         (array_agg(cm.user_id ORDER BY cm.user_id COLLATE "C"))[2] AS second_user
  FROM chats c
  JOIN chat_members cm ON cm.chat_id = c.id
  WHERE c.type = 'direct'
  GROUP BY c.id
  HAVING count(*) = 2
)
UPDATE chats AS c
SET direct_key =
  octet_length(p.first_user)::text || ':' || p.first_user ||
  octet_length(p.second_user)::text || ':' || p.second_user
FROM direct_pairs p
WHERE c.id = p.id;

COMMIT;
