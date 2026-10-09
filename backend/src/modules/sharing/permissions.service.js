const prisma = require('../../config/db');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

const PERMISSION_HIERARCHY = { OWNER: 4, EDITOR: 3, COMMENTER: 2, VIEWER: 1 };

async function getEffectivePermission(sheetId, userId) {
  const sheet = await prisma.sheet.findUnique({
    where: { id: parseInt(sheetId, 10) },
    include: { workspace: true }
  });

  if (!sheet) {
    throw new NotFoundError('Sheet not found');
  }

  if (sheet.workspace.ownerId === userId) {
    return { level: 'OWNER', sheet };
  }

  const share = await prisma.sheetShare.findUnique({
    where: {
      sheetId_userId: {
        sheetId: parseInt(sheetId, 10),
        userId
      }
    }
  });

  if (share) {
    return { level: share.permission, sheet };
  }

  return { level: null, sheet };
}

async function assertCanView(sheetId, userId) {
  const { level, sheet } = await getEffectivePermission(sheetId, userId);
  if (!level) {
    throw new ForbiddenError('You do not have access to this sheet');
  }
  return sheet;
}

async function assertCanComment(sheetId, userId) {
  const { level, sheet } = await getEffectivePermission(sheetId, userId);
  if (!level || PERMISSION_HIERARCHY[level] < PERMISSION_HIERARCHY.COMMENTER) {
    throw new ForbiddenError('You do not have permission to comment on this sheet');
  }
  return sheet;
}

async function assertCanEdit(sheetId, userId) {
  const { level, sheet } = await getEffectivePermission(sheetId, userId);
  if (!level || PERMISSION_HIERARCHY[level] < PERMISSION_HIERARCHY.EDITOR) {
    throw new ForbiddenError('You do not have permission to edit this sheet');
  }
  return sheet;
}

async function assertIsOwner(sheetId, userId) {
  const { level, sheet } = await getEffectivePermission(sheetId, userId);
  if (level !== 'OWNER') {
    throw new ForbiddenError('Only the sheet owner can perform this action');
  }
  return sheet;
}

module.exports = {
  getEffectivePermission,
  assertCanView,
  assertCanComment,
  assertCanEdit,
  assertIsOwner
};
