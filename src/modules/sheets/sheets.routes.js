const express = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const sheetsController = require('./sheets.controller');

const router = express.Router();

router.use(auth);

router.post(
  '/workspaces/:workspaceId/sheets',
  [body('name').trim().notEmpty().withMessage('Sheet name is required')],
  validate,
  sheetsController.create
);

router.get('/workspaces/:workspaceId/sheets', sheetsController.listByWorkspace);
router.get('/sheets/:id', sheetsController.getById);
router.put(
  '/sheets/:id',
  [body('name').trim().notEmpty().withMessage('Sheet name is required')],
  validate,
  sheetsController.update
);
router.delete('/sheets/:id', sheetsController.remove);

module.exports = router;
