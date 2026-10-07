const express = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const columnsController = require('./columns.controller');

const router = express.Router();

router.use(auth);

router.post(
  '/:sheetId/columns',
  [
    body('name').trim().notEmpty().withMessage('Column name is required'),
    body('type')
      .isIn(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE'])
      .withMessage('Column type must be TEXT, NUMBER, BOOLEAN, or DATE'),
    body('position').optional().isInt({ min: 0 }).withMessage('Position must be a non-negative integer')
  ],
  validate,
  columnsController.create
);

router.get('/:sheetId/columns', columnsController.listBySheet);

router.put(
  '/:sheetId/columns/:columnId',
  [
    body('name').optional().trim().notEmpty().withMessage('Column name cannot be empty'),
    body('type')
      .optional()
      .isIn(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE'])
      .withMessage('Column type must be TEXT, NUMBER, BOOLEAN, or DATE'),
    body('position').optional().isInt({ min: 0 }).withMessage('Position must be a non-negative integer')
  ],
  validate,
  columnsController.update
);

router.delete('/:sheetId/columns/:columnId', columnsController.remove);

module.exports = router;
