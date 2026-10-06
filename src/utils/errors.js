class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ForbiddenError,
  BadRequestError
};
