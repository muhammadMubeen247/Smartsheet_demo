const columnsService = require('./columns.service');
const { assertSheetOwnership, assertColumnOwnership } = require('../auth/ownership.service');

async function create(req, res, next) {
  try {
    const { sheetId } = req.params;
    const { name, type, position } = req.body;
    
    await assertSheetOwnership(sheetId, req.user.id);
    const column = await columnsService.create({ sheetId, name, type, position });
    
    res.status(201).json({ data: column });
  } catch (error) {
    next(error);
  }
}

async function listBySheet(req, res, next) {
  try {
    const { sheetId } = req.params;
    await assertSheetOwnership(sheetId, req.user.id);
    const columns = await columnsService.listBySheet(sheetId);
    res.json({ data: columns, count: columns.length });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { sheetId, columnId } = req.params;
    const { name, type, position } = req.body;
    
    await assertSheetOwnership(sheetId, req.user.id);
    await assertColumnOwnership(columnId, req.user.id);
    
    const column = await columnsService.update(columnId, { name, type, position });
    res.json({ data: column });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { sheetId, columnId } = req.params;
    await assertSheetOwnership(sheetId, req.user.id);
    await assertColumnOwnership(columnId, req.user.id);
    await columnsService.remove(columnId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  listBySheet,
  update,
  remove
};
