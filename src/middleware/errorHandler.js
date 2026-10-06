const { AppError } = require('../utils/errors');

function notFoundHandler(req, res, next) {
  next(new AppError(404, 'Route not found'));
}

function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = null;

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = err.details;
  }

  const response = {
    error: {
      status,
      message
    }
  };

  if (details) {
    response.error.details = details;
  }

  if (process.env.NODE_ENV === 'development' && status === 500) {
    response.error.stack = err.stack;
  }

  console.error(`[${status}] ${message}`, status === 500 ? err : '');
  
  res.status(status).json(response);
}

module.exports = { notFoundHandler, errorHandler };
