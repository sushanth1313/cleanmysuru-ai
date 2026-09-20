const { sendError } = require('../utils/response');

/**
 * Middleware generator for Zod schema validation
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} [source='body']
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      const formattedErrors = error.errors ? error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })) : [{ message: error.message }];

      return sendError(
        res,
        'VALIDATION_ERROR',
        `Validation failed for ${source}: ${formattedErrors.map((f) => f.message).join(', ')}`,
        400,
        formattedErrors
      );
    }
  };
}

module.exports = {
  validate,
};
