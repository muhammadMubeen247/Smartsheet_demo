const express = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const rowsController = require('./rows.controller');

const router = express.Router();

router.use(auth);

router.post(
  '/:sheetId/rows',
  [
    body('values')
      .isObject()
      .withMessage('Values must be an object with column IDs as keys')
  ],
  validate,
  rowsController.create
);

router.get('/:sheetId/rows', rowsController.listBySheet);
router.get('/:sheetId/rows/:rowId', rowsController.getById);

router.put(
  '/:sheetId/rows/:rowId',
  [
    body('values')
      .isObject()
      .withMessage('Values must be an object with column IDs as keys')
  ],
  validate,
  rowsController.update
);

router.delete('/:sheetId/rows/:rowId', rowsController.remove);

module.exports = router;
