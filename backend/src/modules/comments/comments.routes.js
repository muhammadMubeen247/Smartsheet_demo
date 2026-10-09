const express = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const commentsController = require('./comments.controller');

const router = express.Router();

router.use(auth);

router.get('/sheets/:sheetId/comments', commentsController.listBySheet);
router.get('/sheets/:sheetId/rows/:rowId/comments', commentsController.listByRow);

router.post(
  '/sheets/:sheetId/comments',
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  validate,
  commentsController.createSheetComment
);

router.post(
  '/sheets/:sheetId/rows/:rowId/comments',
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  validate,
  commentsController.createRowComment
);

router.post(
  '/comments/:commentId/replies',
  [body('content').trim().notEmpty().withMessage('Reply content is required')],
  validate,
  commentsController.createReply
);

router.patch(
  '/sheets/:sheetId/comments/:commentId',
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  validate,
  commentsController.update
);

router.delete('/sheets/:sheetId/comments/:commentId', commentsController.remove);

module.exports = router;
