import { initializeDatabase } from './connection';
import { logger } from '../utils/logger';

const migrate = async () => {
  try {
    await initializeDatabase();
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
