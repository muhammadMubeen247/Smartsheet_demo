const express = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const workspacesController = require('./workspaces.controller');

const router = express.Router();

router.use(auth);

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Workspace name is required')],
  validate,
  workspacesController.create
);

router.get('/', workspacesController.list);
router.get('/:id', workspacesController.getById);
router.put(
  '/:id',
  [body('name').trim().notEmpty().withMessage('Workspace name is required')],
  validate,
  workspacesController.update
);
router.delete('/:id', workspacesController.remove);

module.exports = router;
