import { Pool, type PoolClient } from 'pg';
import { config } from './config';
import { PG_CONNECTION_TIMEOUT_MS, PG_IDLE_TIMEOUT_MS, PG_POOL_MAX } from './constants';
import { logger } from './logger';

export const db = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: PG_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: PG_IDLE_TIMEOUT_MS,
  max: PG_POOL_MAX,
});

db.on('error', (error: Error): void => {
  logger.error('Unexpected PostgreSQL pool error:', error);
});

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError: unknown) {
      logger.error('Failed to roll back transaction:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
