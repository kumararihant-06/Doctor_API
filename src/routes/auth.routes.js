import express from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';
import * as controller from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register',
  validate({ body: registerSchema }),
  controller.register
);

router.post('/login',
  validate({ body: loginSchema }),
  controller.login
);

router.post('/logout',
  requireAuth,
  controller.logout
);

router.get('/verify',
  controller.verify
);

export default router;