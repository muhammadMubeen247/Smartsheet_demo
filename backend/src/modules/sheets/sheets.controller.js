const sheetsService = require('./sheets.service');
const { assertWorkspaceCanEdit, assertWorkspaceAccess } = require('../auth/ownership.service');
const { assertCanView, assertCanEdit, assertIsOwner } = require('../sharing/permissions.service');

async function create(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const { name } = req.body;
    
    await assertWorkspaceCanEdit(workspaceId, req.user.id);
    const sheet = await sheetsService.create({ name, workspaceId });
    
    res.status(201).json({ data: sheet });
  } catch (error) {
    next(error);
  }
}

async function listByWorkspace(req, res, next) {
  try {
    const { workspaceId } = req.params;
    await assertWorkspaceAccess(workspaceId, req.user.id);
    const sheets = await sheetsService.listByWorkspace(workspaceId);
    res.json({ data: sheets, count: sheets.length });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    await assertCanView(id, req.user.id);
    const sheet = await sheetsService.getById(id);
    res.json({ data: sheet });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await assertCanEdit(id, req.user.id);
    const sheet = await sheetsService.update(id, { name });
    res.json({ data: sheet });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await assertIsOwner(id, req.user.id);
    await sheetsService.remove(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  listByWorkspace,
  getById,
  update,
  remove
};
