import express from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  openSlotsQuerySchema,
  bookAppointmentSchema,
  idParamSchema
} from '../validators/patient.validators.js';
import * as controller from '../controllers/patient.controller.js';

const router = express.Router();

router.use(requireAuth, requireRole('patient'));

router.get('/slots/open',
  validate({ query: openSlotsQuerySchema }),
  controller.listOpenSlots
);

router.post('/appointments',
  validate({ body: bookAppointmentSchema }),
  controller.bookAppointment
);

router.get('/appointments',
  controller.listAppointments
);

router.get('/appointments/:id',
  validate({ params: idParamSchema }),
  controller.getAppointment
);

router.patch('/appointments/:id/cancel',
  validate({ params: idParamSchema }),
  controller.cancelAppointment
);

export default router;