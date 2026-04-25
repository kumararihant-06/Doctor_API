import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,                    
  idleTimeoutMillis: 30_000,  
  connectionTimeoutMillis: 5_000  
});

pool.on('error', (err) => {
  console.error('[pg pool] unexpected error on idle client', err);
});

export default pool;

