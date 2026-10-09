const prisma = require('../../config/db');
const { AppError, BadRequestError, NotFoundError } = require('../../utils/errors');

/**
 * List all workspaces shared with a specific user
 * @param {number} userId - The user ID to find shared workspaces for
 * @returns {Promise<Array>} Array of shared workspaces with details
 */
async function listSharedWithMe(userId) {
  const shares = await prisma.workspaceShare.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          owner: { 
            select: { 
              id: true, 
              name: true, 
              email: true 
            } 
          },
          _count: { 
            select: { 
              sheets: true 
            } 
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return shares.map(share => ({
    id: share.workspace.id,
    name: share.workspace.name,
    ownerId: share.workspace.ownerId,
    ownerName: share.workspace.owner.name,
    ownerEmail: share.workspace.owner.email,
    permission: share.permission,
    sheetCount: share.workspace._count.sheets,
    sharedAt: share.createdAt,
    shareId: share.id,
  }));
}

/**
 * Share a workspace with a user
 * @param {Object} params - Share parameters
 * @param {number} params.workspaceId - Workspace ID to share
 * @param {string} params.email - Email of user to share with
 * @param {string} params.permission - Permission level (EDITOR, COMMENTER, VIEWER)
 * @returns {Promise<Object>} Created share record
 */
async function shareWorkspace({ workspaceId, email, permission }) {
  // Validate workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: { select: { id: true, email: true } } },
  });

  if (!workspace) {
    throw new NotFoundError('Workspace not found');
  }

  // Validate target user exists
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!targetUser) {
    throw new NotFoundError('No registered user found with this email');
  }

  // Prevent sharing with owner
  if (workspace.ownerId === targetUser.id) {
    throw new BadRequestError('Cannot share workspace with the owner');
  }

  // Check for existing share
  const existingShare = await prisma.workspaceShare.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUser.id,
      },
    },
  });

  if (existingShare) {
    throw new AppError(409, 'Workspace is already shared with this user');
  }

  // Create share
  const share = await prisma.workspaceShare.create({
    data: {
      workspaceId,
      userId: targetUser.id,
      permission,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    id: share.id,
    workspaceId: share.workspaceId,
    userId: share.userId,
    userName: share.user.name,
    userEmail: share.user.email,
    permission: share.permission,
    createdAt: share.createdAt,
  };
}

/**
 * Get all shares for a specific workspace
 * @param {number} workspaceId - Workspace ID
 * @returns {Promise<Array>} Array of shares
 */
async function listByWorkspace(workspaceId) {
  const shares = await prisma.workspaceShare.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return shares.map(share => ({
    id: share.id,
    workspaceId: share.workspaceId,
    userId: share.userId,
    userName: share.user.name,
    userEmail: share.user.email,
    permission: share.permission,
    createdAt: share.createdAt,
  }));
}

/**
 * Update a workspace share's permission
 * @param {number} shareId - Share ID to update
 * @param {string} permission - New permission level
 * @returns {Promise<Object>} Updated share
 */
async function updateShare(workspaceId, shareId, permission) {
  const existingShare = await prisma.workspaceShare.findFirst({
    where: { id: shareId, workspaceId },
  });
  if (!existingShare) {
    throw new NotFoundError('Share not found for this workspace');
  }

  const share = await prisma.workspaceShare.update({
    where: { id: shareId },
    data: { permission },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    id: share.id,
    workspaceId: share.workspaceId,
    userId: share.userId,
    userName: share.user.name,
    userEmail: share.user.email,
    permission: share.permission,
    createdAt: share.createdAt,
  };
}

/**
 * Remove a workspace share
 * @param {number} shareId - Share ID to remove
 */
async function removeShare(workspaceId, shareId) {
  const share = await prisma.workspaceShare.findFirst({
    where: { id: shareId, workspaceId },
  });
  if (!share) {
    throw new NotFoundError('Share not found for this workspace');
  }

  await prisma.workspaceShare.delete({ where: { id: shareId } });
}

module.exports = {
  listSharedWithMe,
  shareWorkspace,
  listByWorkspace,
  updateShare,
  removeShare,
};
