-- Run: psql "$DATABASE_URL" -f schema.sql
-- This drops existing chat data so the file can be re-run safely.

DROP TABLE IF EXISTS chat_members;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chats (
  id         UUID PRIMARY KEY,
  type       TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  -- Length-prefixed sorted user ids; built by src/directKey.ts.
  direct_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_members (
  chat_id UUID NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX chat_members_user_id_idx ON chat_members (user_id);
