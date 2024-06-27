// lib/database.ts
import mariadb from 'mariadb';
import config from 'config';

/**
 *
 */
interface DbConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

// Load database configuration from the config module
const dbConfig = config.get('db') as DbConfig;

const pool = mariadb.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  connectionLimit: dbConfig.connectionLimit,
});

export default pool;
