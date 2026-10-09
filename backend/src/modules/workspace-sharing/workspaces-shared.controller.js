const workspaceSharedService = require('./workspaces-shared.service');
const { assertWorkspaceOwnership } = require('../auth/ownership.service');

/**
 * List workspaces shared with the current user
 * GET /workspaces/shared-with-me
 */
async function listSharedWithMe(req, res, next) {
  try {
    const workspaces = await workspaceSharedService.listSharedWithMe(req.user.id);
    res.json(workspaces);
  } catch (error) {
    next(error);
  }
}

/**
 * Share a workspace with a user
 * POST /workspaces/:workspaceId/shares
 */
async function create(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const { email, permission } = req.body;

    await assertWorkspaceOwnership(workspaceId, req.user.id);
    const share = await workspaceSharedService.shareWorkspace({
      workspaceId: parseInt(workspaceId, 10),
      email,
      permission,
    });

    res.status(201).json(share);
  } catch (error) {
    next(error);
  }
}

/**
 * List all shares for a workspace
 * GET /workspaces/:workspaceId/shares
 */
async function listByWorkspace(req, res, next) {
  try {
    const { workspaceId } = req.params;
    await assertWorkspaceOwnership(workspaceId, req.user.id);
    const shares = await workspaceSharedService.listByWorkspace(parseInt(workspaceId, 10));
    res.json(shares);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a share's permission
 * PATCH /workspaces/:workspaceId/shares/:shareId
 */
async function updateShare(req, res, next) {
  try {
    const { workspaceId, shareId } = req.params;
    const { permission } = req.body;

    await assertWorkspaceOwnership(workspaceId, req.user.id);
    const share = await workspaceSharedService.updateShare(
      parseInt(workspaceId, 10),
      parseInt(shareId, 10),
      permission
    );

    res.json(share);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove a share
 * DELETE /workspaces/:workspaceId/shares/:shareId
 */
async function removeShare(req, res, next) {
  try {
    const { workspaceId, shareId } = req.params;
    await assertWorkspaceOwnership(workspaceId, req.user.id);
    await workspaceSharedService.removeShare(parseInt(workspaceId, 10), parseInt(shareId, 10));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSharedWithMe,
  create,
  listByWorkspace,
  updateShare,
  removeShare,
};
