import { query } from './connection';
import { logger } from '../utils/logger';

export const createTables = async () => {
  try {
    // Operators table
    await query(`
      CREATE TABLE IF NOT EXISTS operators (
        id SERIAL PRIMARY KEY,
        login VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50),
        email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'offline',
        role VARCHAR(20) DEFAULT 'operator',
        team_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Teams table
    await query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Channels table
    await query(`
      CREATE TABLE IF NOT EXISTS channels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        api_config JSONB,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dialogs table
    await query(`
      CREATE TABLE IF NOT EXISTS dialogs (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER REFERENCES channels(id),
        client_id VARCHAR(255),
        client_name VARCHAR(255),
        client_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'new',
        rating INTEGER,
        assigned_operator_id INTEGER REFERENCES operators(id),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        first_response_at TIMESTAMP,
        closed_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        dialog_id INTEGER REFERENCES dialogs(id) ON DELETE CASCADE,
        operator_id INTEGER REFERENCES operators(id),
        sender_type VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        content_type VARCHAR(50) DEFAULT 'text',
        file_url VARCHAR(500),
        edited BOOLEAN DEFAULT false,
        deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dialog participants (for multi-operator chats)
    await query(`
      CREATE TABLE IF NOT EXISTS dialog_participants (
        id SERIAL PRIMARY KEY,
        dialog_id INTEGER REFERENCES dialogs(id) ON DELETE CASCADE,
        operator_id INTEGER REFERENCES operators(id),
        invited_by INTEGER REFERENCES operators(id),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP
      )
    `);

    // Quick phrases (templates)
    await query(`
      CREATE TABLE IF NOT EXISTS quick_phrases (
        id SERIAL PRIMARY KEY,
        operator_id INTEGER REFERENCES operators(id),
        category VARCHAR(100),
        phrase TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Statistics table
    await query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        operator_id INTEGER REFERENCES operators(id),
        date DATE NOT NULL,
        dialogs_handled INTEGER DEFAULT 0,
        dialogs_missed INTEGER DEFAULT 0,
        avg_response_time INTEGER,
        total_response_time INTEGER DEFAULT 0,
        response_count INTEGER DEFAULT 0,
        rating_sum INTEGER DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(operator_id, date)
      )
    `);

    // Bot interactions table
    await query(`
      CREATE TABLE IF NOT EXISTS bot_interactions (
        id SERIAL PRIMARY KEY,
        dialog_id INTEGER REFERENCES dialogs(id),
        client_choice VARCHAR(255),
        bot_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // SMS verification table
    await query(`
      CREATE TABLE IF NOT EXISTS sms_verifications (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(50) NOT NULL,
        code VARCHAR(10) NOT NULL,
        verified BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_dialogs_status ON dialogs(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dialogs_channel ON dialogs(channel_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dialogs_operator ON dialogs(assigned_operator_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_dialog ON messages(dialog_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dialogs_created ON dialogs(created_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics(date)`);

    logger.info('Database schema created successfully');
  } catch (error) {
    logger.error('Error creating database schema:', error);
    throw error;
  }
};
