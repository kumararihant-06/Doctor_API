import config from '../config/index.js';

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;

  if (status >= 500) {
    console.error('[error]', err);
  } else {
    console.warn(`[${status}]`, err.message);
  }

  const body = {
    message: err.message || 'Internal server error'
  };

  if (err.details) {
    body.details = err.details;
  }

  if (!config.isProduction && status >= 500) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
};