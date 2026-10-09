const prisma = require('../../config/db');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');

async function listBySheet(sheetId) {
  const comments = await prisma.comment.findMany({
    where: { sheetId: parseInt(sheetId, 10), rowId: null },
    include: {
      author: { select: { id: true, name: true, email: true } },
      replies: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return comments;
}

async function listByRow(sheetId, rowId) {
  const comments = await prisma.comment.findMany({
    where: {
      sheetId: parseInt(sheetId, 10),
      rowId: parseInt(rowId, 10),
      parentCommentId: null
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      replies: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return comments;
}

async function create({ sheetId, rowId, content, authorId }) {
  const parsedSheetId = parseInt(sheetId, 10);
  
  const sheet = await prisma.sheet.findUnique({ where: { id: parsedSheetId } });
  if (!sheet) {
    throw new NotFoundError('Sheet not found');
  }

  const data = {
    content,
    authorId,
    sheetId: parsedSheetId
  };

  if (rowId !== undefined && rowId !== null) {
    const parsedRowId = parseInt(rowId, 10);
    const row = await prisma.row.findFirst({
      where: { id: parsedRowId, sheetId: parsedSheetId }
    });
    if (!row) {
      throw new NotFoundError('Row not found in this sheet');
    }
    data.rowId = parsedRowId;
  }

  const comment = await prisma.comment.create({
    data,
    include: {
      author: { select: { id: true, name: true, email: true } }
    }
  });

  return comment;
}

async function createReply(parentCommentId, content, authorId) {
  const parsedParentId = parseInt(parentCommentId, 10);

  const parentComment = await prisma.comment.findUnique({
    where: { id: parsedParentId }
  });
  if (!parentComment) {
    throw new NotFoundError('Parent comment not found');
  }

  if (parentComment.parentCommentId) {
    throw new BadRequestError('Cannot reply to a reply. Only top-level comments can have replies.');
  }

  const reply = await prisma.comment.create({
    data: {
      content,
      authorId,
      sheetId: parentComment.sheetId,
      rowId: parentComment.rowId,
      parentCommentId: parsedParentId
    },
    include: {
      author: { select: { id: true, name: true, email: true } }
    }
  });

  return reply;
}

async function update(commentId, content, userId, isOwner) {
  const parsedCommentId = parseInt(commentId, 10);

  const comment = await prisma.comment.findUnique({
    where: { id: parsedCommentId }
  });
  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  if (comment.authorId !== userId && !isOwner) {
    throw new ForbiddenError('You can only edit your own comments');
  }

  const updated = await prisma.comment.update({
    where: { id: parsedCommentId },
    data: { content },
    include: {
      author: { select: { id: true, name: true, email: true } }
    }
  });

  return updated;
}

async function remove(commentId, userId, isOwner) {
  const parsedCommentId = parseInt(commentId, 10);

  const comment = await prisma.comment.findUnique({
    where: { id: parsedCommentId }
  });
  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  if (comment.authorId !== userId && !isOwner) {
    throw new ForbiddenError('You can only delete your own comments');
  }

  await prisma.comment.delete({ where: { id: parsedCommentId } });
}

module.exports = {
  listBySheet,
  listByRow,
  create,
  createReply,
  update,
  remove
};
