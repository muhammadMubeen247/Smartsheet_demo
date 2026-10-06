const express = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const formsController = require('./forms.controller');

const router = express.Router();

router.get('/:slug', formsController.getPublicForm);

router.post(
  '/:slug/submit',
  [
    body('values')
      .isObject()
      .withMessage('Values must be an object with column IDs as keys')
  ],
  validate,
  formsController.submitPublicForm
);

module.exports = router;
