const prisma = require('../../config/db');
const { NotFoundError } = require('../../utils/errors');
const commentsService = require('./comments.service');
const { assertCanView, assertCanComment, getEffectivePermission } = require('../sharing/permissions.service');

async function listBySheet(req, res, next) {
  try {
    const { sheetId } = req.params;
    await assertCanView(sheetId, req.user.id);
    const comments = await commentsService.listBySheet(sheetId);
    res.json({ data: comments, count: comments.length });
  } catch (error) {
    next(error);
  }
}

async function listByRow(req, res, next) {
  try {
    const { sheetId, rowId } = req.params;
    await assertCanView(sheetId, req.user.id);
    const comments = await commentsService.listByRow(sheetId, rowId);
    res.json({ data: comments, count: comments.length });
  } catch (error) {
    next(error);
  }
}

async function createSheetComment(req, res, next) {
  try {
    const { sheetId } = req.params;
    const { content } = req.body;

    await assertCanComment(sheetId, req.user.id);
    const comment = await commentsService.create({
      sheetId,
      rowId: null,
      content,
      authorId: req.user.id
    });

    res.status(201).json({ data: comment });
  } catch (error) {
    next(error);
  }
}

async function createRowComment(req, res, next) {
  try {
    const { sheetId, rowId } = req.params;
    const { content } = req.body;

    await assertCanComment(sheetId, req.user.id);
    const comment = await commentsService.create({
      sheetId,
      rowId,
      content,
      authorId: req.user.id
    });

    res.status(201).json({ data: comment });
  } catch (error) {
    next(error);
  }
}

async function createReply(req, res, next) {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const parentComment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId, 10) }
    });
    if (!parentComment) {
      throw new NotFoundError('Parent comment not found');
    }

    await assertCanComment(parentComment.sheetId, req.user.id);
    const reply = await commentsService.createReply(commentId, content, req.user.id);

    res.status(201).json({ data: reply });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { commentId, sheetId } = req.params;
    const { content } = req.body;

    const { level } = await getEffectivePermission(sheetId, req.user.id);
    const isOwner = level === 'OWNER';

    const comment = await commentsService.update(commentId, content, req.user.id, isOwner);
    res.json({ data: comment });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { commentId, sheetId } = req.params;

    const { level } = await getEffectivePermission(sheetId, req.user.id);
    const isOwner = level === 'OWNER';

    await commentsService.remove(commentId, req.user.id, isOwner);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listBySheet,
  listByRow,
  createSheetComment,
  createRowComment,
  createReply,
  update,
  remove
};
