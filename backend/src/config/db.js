import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

let pool;

const getPoolConfig = () => {
  if (connectionString) {
    return {
      connectionString,
    };
  }

  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres123',
    database: process.env.PGDATABASE || 'pump_management',
  };
};

const ensureSchema = async () => {
  const schemaSql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(schemaSql);
};

export const getDb = () => {
  if (!pool) {
    pool = new Pool(getPoolConfig());
  }

  return pool;
};

export const query = async (text, params = []) => getDb().query(text, params);

export const withTransaction = async (callback) => {
  const client = await getDb().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const connectDB = async () => {
  pool = getDb();
  await pool.query('SELECT 1');
  await ensureSchema();
  console.log('PostgreSQL connected');
};

export default connectDB;
