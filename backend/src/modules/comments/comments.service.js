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

async function getCommentedRows(sheetId) {
  const rows = await prisma.comment.groupBy({
    by: ['rowId'],
    where: {
      sheetId: parseInt(sheetId, 10),
      rowId: { not: null }
    },
    _count: {
      rowId: true
    }
  });
  return rows.map((r) => ({ rowId: r.rowId, count: r._count.rowId }));
}

async function getConversations(sheetId) {
  const comments = await prisma.comment.findMany({
    where: {
      sheetId: parseInt(sheetId, 10),
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

  // Group by rowId
  const threads = new Map();
  for (const c of comments) {
    const key = c.rowId ?? 'sheet';
    if (!threads.has(key)) {
      threads.set(key, { rowId: c.rowId, comments: [], lastActivity: c.createdAt });
    }
    const thread = threads.get(key);
    thread.comments.push(c);
    // Track most recent activity (latest reply or comment)
    const latestReply = c.replies.length > 0 ? c.replies[c.replies.length - 1].createdAt : null;
    const activity = latestReply && new Date(latestReply) > new Date(thread.lastActivity) ? latestReply : c.createdAt;
    if (new Date(activity) > new Date(thread.lastActivity)) {
      thread.lastActivity = activity;
    }
  }

  // Sort threads by most recent activity (descending)
  return Array.from(threads.values()).sort(
    (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
  );
}

module.exports = {
  listBySheet,
  listByRow,
  create,
  createReply,
  update,
  remove,
  getCommentedRows,
  getConversations
};
