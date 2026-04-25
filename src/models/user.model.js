import { pool } from '../db/pool.js';

export const findByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, role, created_at, updated_at
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

export const create = async ({ name, email, passwordHash, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name, email.toLowerCase(), passwordHash, role]
  );
  return rows[0];
};

export default { findByEmail, findById, create };