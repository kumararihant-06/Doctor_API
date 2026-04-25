import { pool } from '../db/pool.js';

export const findActiveByTokenHash = async (tokenHash) => {
  const { rows } = await pool.query(
    `SELECT s.id        AS session_id,
            s.user_id   AS user_id,
            s.expires_at,
            u.id        AS u_id,
            u.name,
            u.email,
            u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.is_active  = TRUE
       AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    sessionId: r.session_id,
    expiresAt: r.expires_at,
    user: {
      id: r.u_id,
      name: r.name,
      email: r.email,
      role: r.role
    }
  };
};

export const create = async ({ userId, tokenHash, expiresAt }) => {
  const { rows } = await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, is_active, created_at`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
};

export const deactivateByTokenHash = async (tokenHash) => {
  const { rowCount } = await pool.query(
    `UPDATE sessions
     SET is_active = FALSE
     WHERE token_hash = $1
       AND is_active  = TRUE`,
    [tokenHash]
  );
  return rowCount;  
};

export default { findActiveByTokenHash, create, deactivateByTokenHash };