import { pool } from '../db/pool.js';

export const create = async ({ doctorId, startTime, endTime }, client = pool) => {
  const { rows } = await client.query(
    `INSERT INTO availability_slots (doctor_id, start_time, end_time)
     VALUES ($1, $2, $3)
     RETURNING id, doctor_id, start_time, end_time, status, created_at, updated_at`,
    [doctorId, startTime, endTime]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, doctor_id, start_time, end_time, status, created_at, updated_at
     FROM availability_slots
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

export const listByDoctor = async (doctorId, { date, status } = {}) => {
  const params = [doctorId];
  let where = `doctor_id = $1`;

  if (date) {
    // Match any slot whose start_time falls on the given date.
    // Comparing date::date vs the start of the day is index-friendly.
    params.push(date);
    where += ` AND start_time >= $${params.length}::date`;
    params.push(date);
    where += ` AND start_time <  ($${params.length}::date + INTERVAL '1 day')`;
  }

  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT id, doctor_id, start_time, end_time, status, created_at, updated_at
     FROM availability_slots
     WHERE ${where}
     ORDER BY start_time ASC`,
    params
  );
  return rows;
};

export const updateTimes = async (id, { startTime, endTime }) => {
  const { rows } = await pool.query(
    `UPDATE availability_slots
     SET start_time = $1, end_time = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, doctor_id, start_time, end_time, status, updated_at`,
    [startTime, endTime, id]
  );
  return rows[0] || null;
};

export const cancel = async (id) => {
  const { rows } = await pool.query(
    `UPDATE availability_slots
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1
     RETURNING id, status, updated_at`,
    [id]
  );
  return rows[0] || null;
};

export default { create, findById, listByDoctor, updateTimes, cancel };