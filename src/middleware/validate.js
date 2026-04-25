import { ValidationError } from '../utils/errors.js';

const replaceProps = (target, source) => {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, source);
};

export const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      const parsed = schemas.query.parse(req.query);
      replaceProps(req.query, parsed);
    }
    if (schemas.params) {
      const parsed = schemas.params.parse(req.params);
      replaceProps(req.params, parsed);
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