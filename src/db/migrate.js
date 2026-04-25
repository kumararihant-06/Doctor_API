import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

const runMigrations = async () => {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();  // run in filename order: 001 before 002 before 003

  if (files.length === 0) {
    console.log('[migrate] no migrations to run');
    return;
  }

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`[migrate] running ${file}...`);
    try {
      await pool.query(sql);
      console.log(`[migrate] ✓ ${file}`);
    } catch (err) {
      console.error(`[migrate] ✗ ${file} failed:`, err.message);
      throw err;
    }
  }

  console.log('[migrate] done');
};

const command = process.argv[2];

if (command === 'up') {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      pool.end();
      process.exit(1);
    });
} else if (command === 'down') {
  console.log('[migrate] down not implemented — drop and recreate the DB to reset');
  pool.end();
} else {
  console.log('Usage: node src/db/migrate.js up');
  pool.end();
}