const express = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const formsController = require('./forms.controller');

const router = express.Router();

router.post(
  '/workspaces/:workspaceId/sheets/:sheetId/forms',
  auth,
  [
    body('name').trim().notEmpty().withMessage('Form name is required'),
    body('description').optional().isString(),
    body('fields').isArray({ min: 1 }).withMessage('Fields must be a non-empty array')
  ],
  validate,
  formsController.create
);

router.get('/workspaces/:workspaceId/sheets/:sheetId/forms', auth, formsController.listBySheet);

router.get('/forms/:formId', auth, formsController.getById);

router.put(
  '/forms/:formId',
  auth,
  [
    body('name').optional().trim().notEmpty().withMessage('Form name cannot be empty'),
    body('description').optional().isString(),
    body('fields').optional().isArray({ min: 1 }).withMessage('Fields must be a non-empty array')
  ],
  validate,
  formsController.update
);

router.delete('/forms/:formId', auth, formsController.remove);

router.patch('/forms/:formId/toggle', auth, formsController.toggle);

module.exports = router;
