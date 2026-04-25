import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  COOKIE_SAMESITE,
  SESSION_SECRET,
  CORS_ORIGINS
} = process.env;

const required = (name, value) => {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const env = (NODE_ENV || 'development').toLowerCase();
const isProduction = env === 'production';

const config = Object.freeze({
  env,
  isProduction,
  port: parseInt(PORT, 10) || 3000,

  databaseUrl: required('DATABASE_URL', DATABASE_URL),

  cookie: {
    name: SESSION_COOKIE_NAME || 'sid',
    ttlDays: parseInt(SESSION_TTL_DAYS, 10) || 7,
    sameSite: (COOKIE_SAMESITE || 'lax').toLowerCase(),
    secure: isProduction,    // HTTPS-only in prod
    httpOnly: true           // never readable by browser JS (XSS protection)
  },

  sessionSecret: isProduction
    ? required('SESSION_SECRET', SESSION_SECRET)
    : (SESSION_SECRET || 'dev-secret'),

  corsOrigins: (CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
});

export default config;