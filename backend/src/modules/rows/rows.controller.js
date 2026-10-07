const rowsService = require('./rows.service');
const { assertSheetOwnership, assertRowOwnership } = require('../auth/ownership.service');

async function create(req, res, next) {
  try {
    const { sheetId } = req.params;
    const { values } = req.body;
    
    await assertSheetOwnership(sheetId, req.user.id);
    const row = await rowsService.create({ sheetId, values });
    
    res.status(201).json({ data: row });
  } catch (error) {
    next(error);
  }
}

async function listBySheet(req, res, next) {
  try {
    const { sheetId } = req.params;
    await assertSheetOwnership(sheetId, req.user.id);
    const rows = await rowsService.listBySheet(sheetId);
    res.json({ data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { sheetId, rowId } = req.params;
    await assertSheetOwnership(sheetId, req.user.id);
    await assertRowOwnership(rowId, req.user.id);
    const row = await rowsService.getById(rowId);
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { sheetId, rowId } = req.params;
    const { values } = req.body;
    
    await assertSheetOwnership(sheetId, req.user.id);
    await assertRowOwnership(rowId, req.user.id);
    
    const row = await rowsService.update(rowId, { values });
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { sheetId, rowId } = req.params;
    await assertSheetOwnership(sheetId, req.user.id);
    await assertRowOwnership(rowId, req.user.id);
    await rowsService.remove(rowId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  listBySheet,
  getById,
  update,
  remove
};
