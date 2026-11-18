import 'dotenv/config';
import { DEFAULT_PORT, MAX_PORT, MIN_PORT } from './constants';

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_PORT;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`PORT must be an integer between ${MIN_PORT} and ${MAX_PORT}`);
  }

  return port;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === '') {
    throw new Error(`${name} is required (see .env.example)`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === undefined || value === '' ? undefined : value;
}

export const config = {
  port: parsePort(process.env.PORT),
  databaseUrl: requiredEnv('DATABASE_URL'),
  firebaseProjectId: requiredEnv('FIREBASE_PROJECT_ID'),
  firestoreEmulatorHost: optionalEnv('FIRESTORE_EMULATOR_HOST'),
} as const;
