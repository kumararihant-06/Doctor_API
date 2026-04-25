import { pool } from '../db/pool.js';
import * as slotModel from '../models/slot.model.js';
import {
  ConflictError, ForbiddenError, NotFoundError, ValidationError
} from '../utils/errors.js';

const SLOT_DURATION_MIN = 30;

const endOf = (startDate) =>
  new Date(startDate.getTime() + SLOT_DURATION_MIN * 60 * 1000);

export const createManualSlot = async ({ doctorId, startTime }) => {
  const start = startTime;          
  const end = endOf(start);

  try {
    const slot = await slotModel.create({
      doctorId,
      startTime: start,
      endTime: end
    });
    return slot;
  } catch (err) {
    if (err.code === '23P01') {
      throw new ConflictError('This slot overlaps with an existing slot');
    }
    if (err.code === '23514') {
      throw new ValidationError('Slot must be exactly 30 minutes');
    }
    throw err;
  }
};

export const createBulkSlots = async ({ doctorId, date, startTime, slots, slotDurationMinutes }) => {
  // Build the first slot's start time from date + startTime.
  // We use the server's local timezone interpretation; the spec accepts
  // either UTC or local — see README for assumption.
  const [hh, mm] = startTime.split(':').map(Number);
  const [yyyy, mo, dd] = date.split('-').map(Number);
  // Construct as UTC to keep it timezone-stable across environments.
  const firstStart = new Date(Date.UTC(yyyy, mo - 1, dd, hh, mm, 0));

  // Reject batches whose first slot is in the past.
  if (firstStart.getTime() <= Date.now()) {
    throw new ValidationError('Slots must be in the future');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];

    for (let i = 0; i < slots; i++) {
      const start = new Date(firstStart.getTime() + i * slotDurationMinutes * 60 * 1000);
      const end = endOf(start);

      const slot = await slotModel.create(
        { doctorId, startTime: start, endTime: end },
        client    // <-- run inside the transaction
      );
      created.push(slot);
    }

    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23P01') {
      throw new ConflictError('One or more slots overlap with existing slots');
    }
    if (err.code === '23514') {
      throw new ValidationError('Each slot must be exactly 30 minutes');
    }
    throw err;
  } finally {
    client.release();
  }
};

export const listSlots = async ({ doctorId, filters }) => {
  return slotModel.listByDoctor(doctorId, filters);
};

const getOwnedSlot = async (slotId, doctorId) => {
  const slot = await slotModel.findById(slotId);
  if (!slot) {
    throw new NotFoundError('Slot not found');
  }
  if (slot.doctor_id !== doctorId) {
    // Same response as not-found would also be defensible; we use 403 here
    // because the slot exists, the user just isn't allowed to touch it.
    throw new ForbiddenError('You do not own this slot');
  }
  return slot;
};

export const updateSlot = async ({ slotId, doctorId, startTime }) => {
  const slot = await getOwnedSlot(slotId, doctorId);

  if (slot.status === 'booked') {
    throw new ConflictError('Cannot edit a booked slot. Cancel the appointment first.');
  }
  if (slot.status === 'cancelled') {
    throw new ConflictError('Cannot edit a cancelled slot');
  }

  const newEnd = endOf(startTime);

  try {
    const updated = await slotModel.updateTimes(slotId, {
      startTime,
      endTime: newEnd
    });
    return updated;
  } catch (err) {
    if (err.code === '23P01') {
      throw new ConflictError('Updated time overlaps with an existing slot');
    }
    if (err.code === '23514') {
      throw new ValidationError('Slot must be exactly 30 minutes');
    }
    throw err;
  }
};

export const cancelSlot = async ({ slotId, doctorId }) => {
  const slot = await getOwnedSlot(slotId, doctorId);

  if (slot.status === 'booked') {
    throw new ConflictError('Cannot cancel a booked slot. Cancel the appointment first.');
  }
  if (slot.status === 'cancelled') {
    throw new ConflictError('Slot is already cancelled');
  }

  return slotModel.cancel(slotId);
};