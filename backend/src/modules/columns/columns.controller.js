const columnsService = require('./columns.service');
const { assertColumnOwnership } = require('../auth/ownership.service');
const { assertCanView, assertCanEdit } = require('../sharing/permissions.service');
const { BadRequestError } = require('../../utils/errors');

async function create(req, res, next) {
  try {
    const { sheetId } = req.params;
    const { name, type, position } = req.body;
    
    await assertCanEdit(sheetId, req.user.id);
    const column = await columnsService.create({ sheetId, name, type, position });
    
    res.status(201).json({ data: column });
  } catch (error) {
    next(error);
  }
}

async function listBySheet(req, res, next) {
  try {
    const { sheetId } = req.params;
    await assertCanView(sheetId, req.user.id);
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
    
    await assertCanEdit(sheetId, req.user.id);
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
    await assertCanEdit(sheetId, req.user.id);
    await assertColumnOwnership(columnId, req.user.id);
    await columnsService.remove(columnId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function insert(req, res, next) {
  try {
    const { sheetId, columnId } = req.params;
    const { direction, name, type } = req.body;
    if (!direction || !['left', 'right'].includes(direction)) {
      throw new BadRequestError('Direction must be "left" or "right"');
    }
    await assertCanEdit(sheetId, req.user.id);
    const column = await columnsService.insert(sheetId, columnId, direction, { name, type });
    res.status(201).json({ data: column });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  listBySheet,
  update,
  remove,
  insert
};
