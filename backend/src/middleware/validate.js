const { validationResult } = require('express-validator');
const { BadRequestError } = require('../utils/errors');

function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const error = new BadRequestError('Validation failed');
    error.details = errors.array();
    throw error;
  }
  
  next();
}

module.exports = validate;
