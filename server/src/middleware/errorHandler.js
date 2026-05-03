const HttpError = require('../utils/httpError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  // Zod validation errors
  if (err && err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  // Prisma known request errors (e.g., unique constraint)
  if (err && err.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with that value already exists',
      details: { fields: err.meta && err.meta.target },
    });
  }
  if (err && err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Fallback
  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
