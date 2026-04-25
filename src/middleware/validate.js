import { ValidationError } from '../utils/errors.js';

export const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    next();
  } catch (err) {
    if (err.issues) {
      const details = err.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message
      }));
      return next(new ValidationError('Validation failed', details));
    }
    next(err);
  }
};

export default validate;