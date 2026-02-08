import bcrypt from 'bcryptjs';
import { query } from '../src/database/connection';
import { initializeDatabase } from '../src/database/connection';
import { logger } from '../src/utils/logger';

async function createAdmin() {
  try {
    await initializeDatabase();
    
    const login = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';
    const fullName = process.argv[4] || 'Администратор';

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      await query(
        `INSERT INTO operators (login, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)`,
        [login, passwordHash, fullName, 'admin']
      );
      logger.info(`Admin created successfully!`);
      logger.info(`Login: ${login}`);
      logger.info(`Password: ${password}`);
      logger.info(`Full Name: ${fullName}`);
    } catch (error: any) {
      if (error.code === '23505') {
        logger.error('Admin with this login already exists');
      } else {
        throw error;
      }
    }

    process.exit(0);
  } catch (error) {
    logger.error('Failed to create admin:', error);
    process.exit(1);
  }
}

createAdmin();
