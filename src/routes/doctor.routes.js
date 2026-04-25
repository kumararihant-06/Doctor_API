import express from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  manualSlotSchema,
  bulkSlotSchema,
  listSlotsQuerySchema,
  updateSlotSchema,
  idParamSchema
} from '../validators/doctor.validators.js';
import * as controller from '../controllers/doctor.controller.js';

const router = express.Router();

router.use(requireAuth, requireRole('doctor'));

router.post('/availability/manual',
  validate({ body: manualSlotSchema }),
  controller.createManualSlot
);

router.post('/availability/bulk',
  validate({ body: bulkSlotSchema }),
  controller.createBulkSlots
);

router.get('/availability',
  validate({ query: listSlotsQuerySchema }),
  controller.listSlots
);

router.patch('/availability/:id',
  validate({ params: idParamSchema, body: updateSlotSchema }),
  controller.updateSlot
);

router.delete('/availability/:id',
  validate({ params: idParamSchema }),
  controller.cancelSlot
);

export default router;