import { pool } from '../db/pool.js';
import * as appointmentModel from '../models/appointment.model.js';
import {
  ConflictError, ForbiddenError, NotFoundError, ValidationError
} from '../utils/errors.js';

export const listOpenSlots = async (filters) => {
  return appointmentModel.listOpenSlots(filters);
};

export const bookAppointment = async ({ patientId, slotId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Lock and read the slot.
    const slot = await appointmentModel.lockSlotById(slotId, client);

    if (!slot) {
      throw new NotFoundError('Slot not found');
    }

    // Step 2: Validate slot state under the lock.
    if (slot.status === 'booked') {
      throw new ConflictError('This slot is already booked');
    }
    if (slot.status === 'cancelled') {
      throw new ConflictError('This slot has been cancelled');
    }
    if (new Date(slot.start_time).getTime() <= Date.now()) {
      throw new ValidationError('Cannot book a slot in the past');
    }

    // Step 3: Prevent the patient from double-booking themselves.
    const overlapping = await appointmentModel.findPatientOverlapping({
      patientId,
      startTime: slot.start_time,
      endTime: slot.end_time
    }, client);
    if (overlapping) {
      throw new ConflictError('You already have an appointment in this time window');
    }

    // Step 4: Insert the appointment.
    const appointment = await appointmentModel.createAppointment({
      patientId,
      doctorId: slot.doctor_id,
      slotId: slot.id
    }, client);

    // Step 5: Mark the slot booked.
    await appointmentModel.markSlotBooked(slot.id, client);

    await client.query('COMMIT');
    return {
      ...appointment,
      start_time: slot.start_time,
      end_time: slot.end_time
    };
  } catch (err) {
    await client.query('ROLLBACK');

    // If the partial unique index rejected the insert, translate to 409.
    // This catches the rare race-condition path where the lock somehow let
    // two transactions through (shouldn't happen, but defense in depth).
    if (err.code === '23505') {
      throw new ConflictError('This slot is already booked');
    }
    // Foreign key violation — slot id doesn't exist.
    if (err.code === '23503') {
      throw new NotFoundError('Slot not found');
    }
    throw err;
  } finally {
    client.release();
  }
};

export const listAppointments = async (patientId) => {
  return appointmentModel.listByPatient(patientId);
};

export const getAppointment = async ({ appointmentId, patientId }) => {
  const appointment = await appointmentModel.findAppointmentById(appointmentId);

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }
  if (appointment.patient_id !== patientId) {
    throw new ForbiddenError('You do not have access to this appointment');
  }
  return appointment;
};

export const cancelAppointment = async ({ appointmentId, patientId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, patient_id, slot_id, status
       FROM appointments
       WHERE id = $1
       FOR UPDATE`,
      [appointmentId]
    );

    const appt = rows[0];
    if (!appt) {
      throw new NotFoundError('Appointment not found');
    }
    if (appt.patient_id !== patientId) {
      throw new ForbiddenError('You do not have access to this appointment');
    }
    if (appt.status === 'cancelled') {
      throw new ConflictError('Appointment is already cancelled');
    }

    await appointmentModel.cancelAppointment(appointmentId, client);
    await appointmentModel.markSlotAvailable(appt.slot_id, client);

    await client.query('COMMIT');

    return { id: appointmentId, status: 'cancelled' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

