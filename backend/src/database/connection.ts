import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { createTables } from './schema';
import { logger } from '../utils/logger';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'omnichat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error', { text, error });
    throw error;
  }
};

export const initializeDatabase = async () => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    logger.info('Database connection established');
    
    // Create tables
    await createTables();
    logger.info('Database tables created/verified');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
};

export { pool };
