export const notFound = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== 'production') {
    console.error('[API ERROR]', {
      statusCode,
      message: error.message,
      stack: error.stack,
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid resource identifier',
    });
  }

  if (statusCode >= 500) {
    return res.status(500).json({
      code: 'SERVER_UNDER_MAINTENANCE',
      message: 'Server under maintenance',
    });
  }

  return res.status(statusCode).json({
    message: error.message || 'Internal server error',
  });
};
