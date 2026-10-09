const express = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const sharesController = require('./shares.controller');

const router = express.Router();

router.use(auth);

const PERMISSION_VALUES = ['EDITOR', 'COMMENTER', 'VIEWER'];
const permissionValidation = body('permission')
  .isIn(PERMISSION_VALUES)
  .withMessage('Permission must be EDITOR, COMMENTER, or VIEWER');

// GET /sheets/shared-with-me — MUST be defined before /sheets/:sheetId/shares
// to prevent Express from matching "shared-with-me" as a :sheetId param
router.get('/shared-with-me', sharesController.listSharedWithMe);

router.post(
  '/:sheetId/shares',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    permissionValidation
  ],
  validate,
  sharesController.create
);

router.get('/:sheetId/shares', sharesController.listBySheet);

router.patch(
  '/:sheetId/shares/:shareId',
  [permissionValidation],
  validate,
  sharesController.updateShare
);

router.delete('/:sheetId/shares/:shareId', sharesController.removeShare);

module.exports = router;
