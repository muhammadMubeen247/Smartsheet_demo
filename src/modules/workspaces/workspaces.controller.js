const workspacesService = require('./workspaces.service');
const { assertWorkspaceOwnership } = require('../auth/ownership.service');

async function create(req, res, next) {
  try {
    const { name } = req.body;
    const workspace = await workspacesService.create({
      name,
      ownerId: req.user.id
    });
    res.status(201).json({ data: workspace });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const workspaces = await workspacesService.listByOwner(req.user.id);
    res.json({ data: workspaces, count: workspaces.length });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    await assertWorkspaceOwnership(id, req.user.id);
    const workspace = await workspacesService.getById(id);
    res.json({ data: workspace });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await assertWorkspaceOwnership(id, req.user.id);
    const workspace = await workspacesService.update(id, { name });
    res.json({ data: workspace });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await assertWorkspaceOwnership(id, req.user.id);
    await workspacesService.remove(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove
};
