import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import config from './config/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import patientRoutes from './routes/patient.routes.js';

export const buildApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', env: config.env });
  });

  app.use('/auth', authRoutes);
  app.use('/doctor', doctorRoutes);
  app.use('/patient', patientRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default buildApp;