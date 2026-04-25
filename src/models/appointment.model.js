import {pool} from '../db/pool.js';

export const listOpenSlots = async ({ doctorId, date } = {}) => {
  const params = [];
  const conditions = [`s.status = 'available'`, `s.start_time > NOW()`];

  if (doctorId) {
    params.push(doctorId);
    conditions.push(`s.doctor_id = $${params.length}`);
  }

  if (date) {
    params.push(date);
    conditions.push(`s.start_time >= $${params.length}::date`);
    params.push(date);
    conditions.push(`s.start_time < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const { rows } = await pool.query(
    `SELECT s.id, s.doctor_id, s.start_time, s.end_time, s.status,
            u.name AS doctor_name, u.email AS doctor_email
     FROM availability_slots s
     JOIN users u ON u.id = s.doctor_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.start_time ASC
     LIMIT 200`,
    params
  );
  return rows;
};

export const lockSlotById = async (slotId, client) => {
  const { rows } = await client.query(
    `SELECT id, doctor_id, start_time, end_time, status
     FROM availability_slots
     WHERE id = $1
     FOR UPDATE`,
    [slotId]
  );
  return rows[0] || null;
};

export const findPatientOverlapping = async ({ patientId, startTime, endTime }, client) => {
  const { rows } = await client.query(
    `SELECT a.id
     FROM appointments a
     JOIN availability_slots s ON s.id = a.slot_id
     WHERE a.patient_id = $1
       AND a.status     = 'booked'
       AND tstzrange(s.start_time, s.end_time, '[)')
           && tstzrange($2, $3, '[)')
     LIMIT 1`,
    [patientId, startTime, endTime]
  );
  return rows[0] || null;
};

export const createAppointment = async ({ patientId, doctorId, slotId }, client) => {
  const { rows } = await client.query(
    `INSERT INTO appointments (patient_id, doctor_id, slot_id)
     VALUES ($1, $2, $3)
     RETURNING id, patient_id, doctor_id, slot_id, status, created_at`,
    [patientId, doctorId, slotId]
  );
  return rows[0];
};

export const markSlotBooked = async (slotId, client) => {
  await client.query(
    `UPDATE availability_slots
     SET status = 'booked', updated_at = NOW()
     WHERE id = $1`,
    [slotId]
  );
};

export const markSlotAvailable = async (slotId, client) => {
  await client.query(
    `UPDATE availability_slots
     SET status = 'available', updated_at = NOW()
     WHERE id = $1`,
    [slotId]
  );
};

export const cancelAppointment = async (appointmentId, client) => {
  const { rows } = await client.query(
    `UPDATE appointments
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1
     RETURNING id, status, updated_at`,
    [appointmentId]
  );
  return rows[0] || null;
};

export const findAppointmentById = async (id) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.patient_id, a.doctor_id, a.slot_id, a.status,
            a.created_at, a.updated_at,
            s.start_time, s.end_time,
            u.name AS doctor_name, u.email AS doctor_email
     FROM appointments a
     JOIN availability_slots s ON s.id = a.slot_id
     JOIN users u ON u.id = a.doctor_id
     WHERE a.id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

export const listByPatient = async (patientId) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.doctor_id, a.slot_id, a.status,
            a.created_at, a.updated_at,
            s.start_time, s.end_time,
            u.name AS doctor_name, u.email AS doctor_email
     FROM appointments a
     JOIN availability_slots s ON s.id = a.slot_id
     JOIN users u ON u.id = a.doctor_id
     WHERE a.patient_id = $1
     ORDER BY s.start_time DESC`,
    [patientId]
  );
  return rows;
};

export default {
  listOpenSlots,
  lockSlotById,
  findPatientOverlapping,
  createAppointment,
  markSlotBooked,
  markSlotAvailable,
  cancelAppointment,
  findAppointmentById,
  listByPatient
};