# Chat Backend

1:1 chat backend with users and chats in PostgreSQL and messages/read state in
Firebase Firestore. Node.js + TypeScript (`strict`), Express, raw SQL with `pg`,
`firebase-admin`.

## Requirements

- Node.js 20.19+ (Node 22 LTS recommended; `.nvmrc` is included)
- PostgreSQL 14+
- Java 21+ for the Firestore emulator
- `firebase-tools` is installed by `npm ci`; no global install is needed

Default ports:

| Service            | Port |
| ------------------ | ---- |
| API                | 3000 |
| PostgreSQL         | 5432 |
| Firestore emulator | 8080 |
| Emulator UI        | 4000 |

## Quick start (Windows PowerShell)

Run these commands from the project root:

```powershell
# 1. Install dependencies and create the local environment file
npm ci
Copy-Item .env.example .env

# 2. Create the role and database once
#    If they already exist, the CREATE errors can be ignored.
psql postgres -c "CREATE USER chat_user WITH PASSWORD 'chat_password';"
psql postgres -c "CREATE DATABASE chat_db OWNER chat_user;"

# 3. Load the schema and demo users
psql "postgres://chat_user:chat_password@localhost:5432/chat_db" -f schema.sql
psql "postgres://chat_user:chat_password@localhost:5432/chat_db" -f seed.sql

# 4. Terminal 1: start the Firestore emulator (Java 21 required)
npm run emulator

# 5. Terminal 2: start the API in watch mode
npm run dev

# 6. Terminal 3: verify all required APIs end to end
npm run smoke
```

For a production-style run, use `npm run build` followed by `npm start`.
If a step fails, see [Troubleshooting](#troubleshooting).

`npm ci` installs the Firestore emulator tooling locally, so the first install
can take a few minutes.

## Setup (macOS / Linux)

Install the system requirements:

```bash
# Node.js 20.19+ (macOS)
brew install node
# Node.js 20.19+ (Ubuntu 24.04)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 16 and Java 21 (macOS)
brew install postgresql@16 openjdk@21
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
brew services start postgresql@16
sudo ln -sfn "$(brew --prefix openjdk@21)/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-21.jdk

# PostgreSQL and Java 21 (Ubuntu 24.04)
sudo apt install -y postgresql openjdk-21-jre-headless
sudo systemctl start postgresql
```

Then create the database and load the schema:

```bash
# macOS
psql postgres -c "CREATE USER chat_user WITH PASSWORD 'chat_password';"
psql postgres -c "CREATE DATABASE chat_db OWNER chat_user;"

# Ubuntu
sudo -u postgres psql -c "CREATE USER chat_user WITH PASSWORD 'chat_password';"
sudo -u postgres psql -c "CREATE DATABASE chat_db OWNER chat_user;"

# Both
npm ci
cp .env.example .env
psql "postgres://chat_user:chat_password@localhost:5432/chat_db" -f schema.sql
psql "postgres://chat_user:chat_password@localhost:5432/chat_db" -f seed.sql
```

Start the emulator and API in separate terminals:

```bash
npm run emulator
npm run dev
```

For a database created before the collision-safe `direct_key` change, run the
migration once instead of dropping data:

```bash
psql "$DATABASE_URL" -f migrations/001_direct_key.sql
```

`schema.sql` drops and recreates its tables, so it is safe to re-run (it wipes
chat data). `seed.sql` inserts `user_alice`, `user_bob`, and `user_carol`.
The emulator keeps data in memory only; restarting it clears messages and
receipts. `firebase-admin` may log a harmless `MetadataLookupWarning` when the
emulator is used without credentials.

## Environment variables

| Variable                         | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `PORT`                           | HTTP port (default `3000`)                              |
| `DATABASE_URL`                   | PostgreSQL connection string                            |
| `FIREBASE_PROJECT_ID`            | Firebase project id (`demo-chat` for the emulator)      |
| `FIRESTORE_EMULATOR_HOST`        | e.g. `127.0.0.1:8080`; remove for a real project        |
| `GOOGLE_APPLICATION_CREDENTIALS` | Only for a real project: path to a service account JSON |

`src/config.ts` validates the required variables at startup and fails with a
clear message. `PORT` must be an integer between `1` and `65535`.

Switching to a real Firebase project requires no code changes: remove
`FIRESTORE_EMULATOR_HOST`, set `GOOGLE_APPLICATION_CREDENTIALS`, and use the real
project id.

## Verification

Static checks do not need PostgreSQL or Firestore:

```bash
npm run verify
```

Runtime smoke test (API, PostgreSQL, and the Firestore emulator must be running):

```bash
npm run smoke
```

To test a different API port:

```powershell
$env:BASE_URL = "http://127.0.0.1:3001"
npm run smoke
```

## Project structure

```text
src/
  app.ts                  Express app factory
  config.ts               Environment parsing and startup validation
  constants.ts            Status codes, limits, and shared messages
  db.ts                   pg pool and transaction helper
  errors.ts               HttpError
  firestore.ts            Firebase initialization, paths, document mapping
  index.ts                HTTP server and graceful shutdown
  logger.ts               Tiny console logger
  middleware.ts           Async wrapper, 404 handler, central error handler
  types.ts                Shared request and response types
  validation.ts           Body/query/path validation
  routes/
    chat.ts               Thin chat routes
    user.ts               Thin user routes
  services/
    chatService.ts        Chat creation, existence, and membership SQL
    messageService.ts     Message, read receipt, and last-seen Firestore access
    userService.ts        User existence and chat-list SQL
test/
  validation.test.ts      Pure validation and limit-parsing tests
  directKey.test.ts       Direct-chat key collision tests
scripts/
  smoke-test.mjs          End-to-end check for all required APIs
migrations/
  001_direct_key.sql      Recompute keys for existing databases
.nvmrc                    Recommended Node version
schema.sql
seed.sql
```

Routes only parse the request, call a service, and send the response. SQL and
Firestore access live in `src/services/`; the pg pool and Firebase paths live in
the infrastructure files.

## Scripts

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Start the API with `tsx` watch mode                    |
| `npm run build`        | Compile `src/` to `dist/` with `tsconfig.build.json`   |
| `npm start`            | Run the compiled server from `dist/`                   |
| `npm run verify`       | Lint, typecheck, tests, build, and formatting check    |
| `npm run smoke`        | Run the end-to-end API smoke test                      |
| `npm run typecheck`    | `tsc --noEmit` over `src/` and `test/`                 |
| `npm run lint`         | ESLint with type-checked rules, zero warnings          |
| `npm run lint:fix`     | ESLint with `--fix`                                    |
| `npm run format`       | Prettier                                               |
| `npm run format:check` | Verify formatting without writing files                |
| `npm test`             | Vitest pure-logic tests, no database required          |
| `npm run emulator`     | Start the Firestore emulator (included dev dependency) |

Run the full local check before handing off or committing:

```bash
npm run verify
```

`npm run verify` does not need PostgreSQL or Firestore. `npm run smoke` does;
it checks health, create chat, send/list message, read receipt, last seen, and
user chat listing against a running API.

## Troubleshooting

| Symptom                                            | Fix                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL is required`                         | `.env` is missing; run `Copy-Item .env.example .env` (Windows) or `cp`.     |
| `psql is not recognized`                           | Add PostgreSQL's `bin` directory to `PATH`, or run `psql.exe` by full path. |
| `ECONNREFUSED 127.0.0.1:5432`                      | PostgreSQL is not running, or `DATABASE_URL` uses the wrong port.           |
| `database "chat_db" does not exist`                | Create the database as shown in the quick start.                            |
| `relation "users" does not exist`                  | Load `schema.sql` into the database from `.env`.                            |
| `One or both users not found` / smoke create fails | Load `seed.sql`; the demo users are `user_alice`, `user_bob`, `user_carol`. |
| `ECONNREFUSED 127.0.0.1:8080` or Firestore errors  | Start the emulator with `npm run emulator`.                                 |
| `Could not find Java` / emulator exits immediately | Install Java 21 and make sure `java -version` works in that terminal.       |
| `firebase: command not found`                      | Run `npm ci`; `firebase-tools` is installed locally by npm.                 |
| `EADDRINUSE ... :3000`                             | Stop the other process, or set `PORT=3001` and `BASE_URL` for smoke.        |
| `Cannot find module .../dist/index.js`             | Run `npm run build` before `npm start`.                                     |
| `MetadataLookupWarning` in emulator mode           | Harmless; the Admin SDK falls back to the emulator.                         |
| `npm ci` fails with `EBUSY ... node_modules`       | Stop `npm run dev`, `npm start`, and the emulator, then retry `npm ci`.     |
| `npm ERR! ... engine ...`                          | Use Node 20.19+; if using nvm, run `nvm use`.                               |
| PowerShell does not understand `curl` backslashes  | Use `curl.exe`, Git Bash/WSL, or `Invoke-RestMethod`.                       |

## Handoff checklist

- [ ] `npm ci` completes on Node 20.19+
- [ ] `.env` exists and matches the local PostgreSQL port/credentials
- [ ] `schema.sql` and `seed.sql` have been loaded
- [ ] `npm run emulator` is running
- [ ] `npm run dev` is running
- [ ] `npm run verify` passes
- [ ] `npm run smoke` passes
- [ ] The six API paths and response envelopes match the table above
- [ ] No `.env`, credentials, or generated `dist/` files are committed

## PostgreSQL schema

- `users(id TEXT PRIMARY KEY, name TEXT, created_at TIMESTAMPTZ)`
- `chats(id UUID PRIMARY KEY, type TEXT CHECK (type IN ('direct','group')), direct_key TEXT UNIQUE, created_at TIMESTAMPTZ)`
- `chat_members(chat_id UUID, user_id TEXT, PRIMARY KEY (chat_id, user_id))` with
  foreign keys and `ON DELETE CASCADE`

`direct_key` is a length-prefixed encoding of the two sorted user ids:
`<bytes>:<id><bytes>:<id>`. Sorting makes `(A, B)` and `(B, A)` the same chat;
the length prefixes make the key unambiguous even if ids contain `:`.
`INSERT ... ON CONFLICT (direct_key) DO NOTHING` inside a transaction makes
create-or-get idempotent and safe under concurrent requests; the loser of the
race reads the existing row. Existing databases can be migrated with
`migrations/001_direct_key.sql`.

## Firestore structure

```text
chats/{chatId}/messages/{messageId}
  senderId: string
  text: string
  createdAt: timestamp (server timestamp)

chats/{chatId}/messages/{messageId}/reads/{userId}
  readAt: timestamp (server timestamp, written once)

chats/{chatId}/members/{userId}
  lastSeenMessageId: string
  updatedAt: timestamp (server timestamp)
```

## API

All responses use `{ "success": true, "data": ... }` or
`{ "success": false, "error": "..." }`.

| Method | Path                                    | Body / query                              |
| ------ | --------------------------------------- | ----------------------------------------- |
| POST   | `/chat/create`                          | `{ "userAId": "...", "userBId": "..." }`  |
| POST   | `/chat/:chatId/message/send`            | `{ "senderId": "...", "text": "..." }`    |
| GET    | `/chat/:chatId/messages?limit=50`       | `limit` optional, 1..100                  |
| POST   | `/chat/:chatId/message/:messageId/read` | `{ "userId": "..." }`                     |
| POST   | `/chat/:chatId/lastseen`                | `{ "userId": "...", "messageId": "..." }` |
| GET    | `/user/:userId/chats`                   | none                                      |
| GET    | `/health`                               | none; does not touch the database         |

Windows PowerShell examples:

```powershell
Invoke-RestMethod http://localhost:3000/health

$response = Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/chat/create `
  -ContentType 'application/json' `
  -Body '{"userAId":"user_alice","userBId":"user_bob"}'
$chatId = $response.data.chatId
```

The `curl` examples below use bash line continuation. On Windows, use
`curl.exe`, Git Bash/WSL, or `Invoke-RestMethod`.

```bash
# Health
curl -s http://localhost:3000/health

# Create (or get) a direct chat. Returns 201 first time, 200 afterwards.
curl -s -X POST http://localhost:3000/chat/create \
  -H "Content-Type: application/json" \
  -d '{"userAId":"user_alice","userBId":"user_bob"}'

# Send a message
curl -s -X POST http://localhost:3000/chat/<chatId>/message/send \
  -H "Content-Type: application/json" \
  -d '{"senderId":"user_alice","text":"hello"}'

# Latest 50 messages, oldest first
curl -s "http://localhost:3000/chat/<chatId>/messages?limit=50"

# Mark a message read (must not be your own message)
curl -s -X POST http://localhost:3000/chat/<chatId>/message/<messageId>/read \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_bob"}'

# Update last seen message for a user
curl -s -X POST http://localhost:3000/chat/<chatId>/lastseen \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_bob","messageId":"<messageId>"}'

# List a user's chats (member ids come from PostgreSQL)
curl -s http://localhost:3000/user/user_alice/chats
```

## Design decisions

- **Raw SQL instead of an ORM.** The schema is small, and the two queries that
  matter (`INSERT ... ON CONFLICT` and the `array_agg` chat list) are clearer as
  SQL. Every value is parameterized.
- **Canonical `direct_key` for idempotent create.** The key is a length-prefixed
  encoding of the sorted user ids; the unique constraint plus
  `ON CONFLICT DO NOTHING` makes concurrent create requests converge on one
  chat id, and ids containing `:` cannot collide.
- **Firestore ordering and tie-break.** Messages are fetched newest-first by
  `createdAt` and then by document id, because server timestamps can tie. The
  result is reversed so the API always returns ascending messages. The
  document-id tie-break keeps equal timestamps deterministic.
- **Validation strategy.** Express bodies are treated as `unknown` at the route
  boundary. `src/validation.ts` returns typed bodies after checking required
  strings, trimming rules, message length, UUID format, Firestore-safe message
  ids, and the `limit` range. Chat UUIDs are normalized to lowercase so every
  request targets the same Firestore path. There is no `any` in the source.
- **One `HttpError` and one central handler.** Services throw `HttpError` with a
  status and a safe message. The handler maps body-parser `SyntaxError`s to 400,
  logs unexpected errors, and returns a generic 500 without stack traces.
- **Read receipts are write-once.** The first `readAt` wins; a concurrent
  `already-exists` error is the only Firestore error swallowed.
- **Health check without dependencies.** `GET /health` returns
  `{ "success": true }` and does not query PostgreSQL or Firestore.
- **Graceful shutdown.** `SIGINT`/`SIGTERM` close the HTTP server, then the pg
  pool, with a timeout if a connection refuses to close.

## Known limitations

- No authentication: ids are trusted from the request. In production, derive
  `userId` from a verified token.
- No user creation API; users come from `seed.sql`.
- Direct chats only. The schema allows `type = 'group'`, but no group endpoints
  are implemented (bonus not built).
- No message edit/delete (bonus not built).
- `GET /messages` returns the latest N messages, not cursor-based pages.
- Firestore security rules are not configured; clients must go through this API
  (the Admin SDK bypasses rules).
