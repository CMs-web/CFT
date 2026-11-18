# Chat Backend

Small 1:1 chat API. PostgreSQL stores users, chats and chat members.
Firestore stores messages, read receipts and last-seen state.

## Stack

- Node.js 20.19+ (`.nvmrc` uses Node 22)
- TypeScript, Express, `pg`, `firebase-admin`
- PostgreSQL 14+
- Firestore emulator (Java 21 required)
- ESLint, Prettier, Vitest

## API

| Method | Path                                    | Body                                      |
| ------ | --------------------------------------- | ----------------------------------------- |
| POST   | `/chat/create`                          | `{ "userAId": "...", "userBId": "..." }`  |
| POST   | `/chat/:chatId/message/send`            | `{ "senderId": "...", "text": "..." }`    |
| GET    | `/chat/:chatId/messages?limit=50`       | `limit` is optional, 1..100               |
| POST   | `/chat/:chatId/message/:messageId/read` | `{ "userId": "..." }`                     |
| POST   | `/chat/:chatId/lastseen`                | `{ "userId": "...", "messageId": "..." }` |
| GET    | `/user/:userId/chats`                   | none                                      |
| GET    | `/health`                               | none                                      |

Responses are `{ "success": true, "data": ... }` or
`{ "success": false, "error": "..." }`.

## Run locally

You need Node.js, PostgreSQL and Java 21 installed. `firebase-tools` is already
a dev dependency, so there is nothing to install globally.

### 1. Install dependencies

```bash
npm ci
```

### 2. Create `.env`

```bash
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

The default `.env` expects PostgreSQL on `localhost:5432`.

### 3. Create the database and seed data

```bash
# Run once as a PostgreSQL superuser
psql postgres -c "CREATE USER chat_user WITH PASSWORD 'chat_password';"
psql postgres -c "CREATE DATABASE chat_db OWNER chat_user;"
```

```bash
# Load the schema and demo users
psql "postgres://chat_user:chat_password@localhost:5432/chat_db" -f schema.sql
psql "postgres://chat_user:chat_password@localhost:5432/chat_db" -f seed.sql
```

`schema.sql` drops and recreates the tables. `seed.sql` creates `user_alice`,
`user_bob` and `user_carol`.

If you already have a database from the older `direct_key` format, run:

```bash
psql "$DATABASE_URL" -f migrations/001_direct_key.sql
```

### 4. Start the Firestore emulator

In one terminal:

```bash
npm run emulator
```

Java 21 must be available in that terminal.

### 5. Start the API

In another terminal:

```bash
npm run dev
```

### 6. Check that everything works

In a third terminal:

```bash
npm run smoke
```

This creates a chat, sends a message, reads it, updates last seen and lists
chats for `user_alice`. If the API is still starting, it waits up to 20 seconds.

For a compiled run:

```bash
npm run build
npm start
```

## Environment variables

```dotenv
PORT=3000
DATABASE_URL=postgres://chat_user:chat_password@localhost:5432/chat_db
FIREBASE_PROJECT_ID=demo-chat
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

For a real Firebase project, remove `FIRESTORE_EMULATOR_HOST` and set
`GOOGLE_APPLICATION_CREDENTIALS` to a service account file. No code changes are
needed.

## Scripts

```bash
npm run dev        # API with reload
npm run build      # compile to dist/
npm start          # run the compiled API
npm run verify     # lint, typecheck, tests, build and format check
npm run smoke      # end-to-end API check
npm run emulator   # Firestore emulator
npm test           # unit tests only, no database needed
```

## Project layout

```text
src/routes/       HTTP routes
src/services/     business logic, SQL and Firestore access
src/validation.ts request validation
src/db.ts         PostgreSQL pool and transactions
src/firestore.ts  Firebase setup and document paths
scripts/          smoke test
test/             unit tests
schema.sql        database schema
seed.sql          demo users
```

## Common problems

- `DATABASE_URL is required` — `.env` is missing.
- `ECONNREFUSED 127.0.0.1:5432` — PostgreSQL is not running, or the port is different.
- `relation "users" does not exist` — run `schema.sql`.
- `One or both users not found` — run `seed.sql`.
- `ECONNREFUSED 127.0.0.1:8080` — start the Firestore emulator.
- `Could not find Java` — install Java 21 and check `java -version`.
- `psql is not recognized` — add PostgreSQL's `bin` folder to `PATH`.
- `EADDRINUSE :3000` — stop the other process or change `PORT`.
- `Cannot find module dist/index.js` — run `npm run build` first.
- `npm ci` fails with `EBUSY` on Windows — stop the API/emulator and retry.
- `MetadataLookupWarning` — harmless when using the emulator.

## Notes

- Direct chats only. Group chat endpoints are not implemented.
- There is no authentication; user ids are taken from the request body.
- Message edit/delete and cursor pagination are not part of the task.
- Chat UUIDs are normalized to lowercase, so uppercase and lowercase ids point to
  the same chat.
- `direct_key` is length-prefixed, so user ids containing `:` cannot collide.
