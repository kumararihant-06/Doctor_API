import * as patientService from '../services/patient.service.js';

export const listOpenSlots = async (req, res) => {
  const slots = await patientService.listOpenSlots(req.query);
  res.status(200).json({ slots });
};

export const bookAppointment = async (req, res) => {
  const appointment = await patientService.bookAppointment({
    patientId: req.user.id,
    slotId: req.body.slotId
  });
  res.status(201).json({ appointment });
};

export const listAppointments = async (req, res) => {
  const appointments = await patientService.listAppointments(req.user.id);
  res.status(200).json({ appointments });
};

export const getAppointment = async (req, res) => {
  const appointment = await patientService.getAppointment({
    appointmentId: req.params.id,
    patientId: req.user.id
  });
  res.status(200).json({ appointment });
};

export const cancelAppointment = async (req, res) => {
  const appointment = await patientService.cancelAppointment({
    appointmentId: req.params.id,
    patientId: req.user.id
  });
  res.status(200).json({ appointment });
};