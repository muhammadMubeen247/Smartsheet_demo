const prisma = require('../../config/db');
const { NotFoundError, BadRequestError, AppError } = require('../../utils/errors');

async function create({ sheetId, email, permission }) {
  const parsedSheetId = parseInt(sheetId, 10);

  const user = await prisma.user.findUnique({
    where: { email }
  });
  if (!user) {
    throw new NotFoundError('No registered user found with this email');
  }

  const sheet = await prisma.sheet.findUnique({
    where: { id: parsedSheetId },
    include: { workspace: true }
  });
  if (!sheet) {
    throw new NotFoundError('Sheet not found');
  }

  if (sheet.workspace.ownerId === user.id) {
    throw new BadRequestError('Cannot share a sheet with its owner');
  }

  const existingShare = await prisma.sheetShare.findUnique({
    where: {
      sheetId_userId: {
        sheetId: parsedSheetId,
        userId: user.id
      }
    }
  });
  if (existingShare) {
    throw new AppError(409, 'This user already has access to this sheet');
  }

  const share = await prisma.sheetShare.create({
    data: {
      sheetId: parsedSheetId,
      userId: user.id,
      permission
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return share;
}

async function listBySheet(sheetId) {
  const shares = await prisma.sheetShare.findMany({
    where: { sheetId: parseInt(sheetId, 10) },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return shares;
}

async function updateShare({ sheetId, shareId, permission }) {
  const parsedSheetId = parseInt(sheetId, 10);
  const parsedShareId = parseInt(shareId, 10);

  const share = await prisma.sheetShare.findUnique({
    where: { id: parsedShareId }
  });
  if (!share || share.sheetId !== parsedSheetId) {
    throw new NotFoundError('Share not found for this sheet');
  }

  const updated = await prisma.sheetShare.update({
    where: { id: parsedShareId },
    data: { permission },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return updated;
}

async function removeShare({ sheetId, shareId }) {
  const parsedSheetId = parseInt(sheetId, 10);
  const parsedShareId = parseInt(shareId, 10);

  const share = await prisma.sheetShare.findUnique({
    where: { id: parsedShareId }
  });
  if (!share || share.sheetId !== parsedSheetId) {
    throw new NotFoundError('Share not found for this sheet');
  }

  await prisma.sheetShare.delete({ where: { id: parsedShareId } });
}

async function listSharedWithMe(userId) {
  const shares = await prisma.sheetShare.findMany({
    where: { userId },
    include: {
      sheet: {
        include: {
          workspace: {
            include: {
              owner: { select: { id: true, name: true, email: true } }
            }
          },
          _count: { select: { rows: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return shares.map(share => ({
    id: share.sheet.id,
    name: share.sheet.name,
    workspaceId: share.sheet.workspaceId,
    workspaceName: share.sheet.workspace.name,
    ownerName: share.sheet.workspace.owner.name,
    ownerEmail: share.sheet.workspace.owner.email,
    permission: share.permission,
    rowCount: share.sheet._count.rows,
    sharedAt: share.createdAt,
    shareId: share.id
  }));
}

module.exports = {
  create,
  listBySheet,
  updateShare,
  removeShare,
  listSharedWithMe
};
