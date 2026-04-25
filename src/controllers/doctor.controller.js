import * as doctorService from '../services/doctor.service.js';

export const createManualSlot = async (req, res) => {
  const slot = await doctorService.createManualSlot({
    doctorId: req.user.id,
    startTime: req.body.startTime
  });
  res.status(201).json({ slot });
};

export const createBulkSlots = async (req, res) => {
  const slots = await doctorService.createBulkSlots({
    doctorId: req.user.id,
    ...req.body
  });
  res.status(201).json({
    count: slots.length,
    slots
  });
};

export const listSlots = async (req, res) => {
  const slots = await doctorService.listSlots({
    doctorId: req.user.id,
    filters: req.query
  });
  res.status(200).json({ slots });
};

export const updateSlot = async (req, res) => {
  const slot = await doctorService.updateSlot({
    slotId: req.params.id,
    doctorId: req.user.id,
    startTime: req.body.startTime
  });
  res.status(200).json({ slot });
};

export const cancelSlot = async (req, res) => {
  const slot = await doctorService.cancelSlot({
    slotId: req.params.id,
    doctorId: req.user.id
  });
  res.status(200).json({ slot });
};