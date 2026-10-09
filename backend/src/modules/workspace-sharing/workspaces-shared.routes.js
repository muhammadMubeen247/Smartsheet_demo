const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const workspaceSharedController = require('./workspaces-shared.controller');

// List workspaces shared with current user
// MUST be before /:workspaceId to avoid matching "shared-with-me" as a workspaceId
router.get('/shared-with-me', auth, workspaceSharedController.listSharedWithMe);

// Share a workspace with a user
router.post(
  '/:workspaceId/shares',
  auth,
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),
  body('permission')
    .isIn(['EDITOR', 'COMMENTER', 'VIEWER'])
    .withMessage('Permission must be EDITOR, COMMENTER, or VIEWER'),
  validate,
  workspaceSharedController.create
);

// List all shares for a workspace
router.get(
  '/:workspaceId/shares',
  auth,
  workspaceSharedController.listByWorkspace
);

// Update a share's permission
router.patch(
  '/:workspaceId/shares/:shareId',
  auth,
  body('permission')
    .isIn(['EDITOR', 'COMMENTER', 'VIEWER'])
    .withMessage('Permission must be EDITOR, COMMENTER, or VIEWER'),
  validate,
  workspaceSharedController.updateShare
);

// Remove a share
router.delete(
  '/:workspaceId/shares/:shareId',
  auth,
  workspaceSharedController.removeShare
);

module.exports = router;
