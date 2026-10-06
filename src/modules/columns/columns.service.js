const prisma = require('../../config/db');
const { AppError, BadRequestError } = require('../../utils/errors');

const VALID_TYPES = ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE'];

async function create({ sheetId, name, type, position }) {
  const sheetIdInt = parseInt(sheetId, 10);
  
  if (!VALID_TYPES.includes(type)) {
    throw new BadRequestError(`Invalid column type. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (position === undefined || position === null) {
    const maxPosition = await prisma.column.aggregate({
      where: { sheetId: sheetIdInt },
      _max: { position: true }
    });
    position = (maxPosition._max.position ?? -1) + 1;
  }

  try {
    const column = await prisma.column.create({
      data: {
        sheetId: sheetIdInt,
        name,
        type,
        position
      }
    });
    return column;
  } catch (error) {
    if (error.code === 'P2002') {
      if (error.meta.target.includes('sheetId_name')) {
        throw new AppError(409, 'Column name already exists in this sheet');
      }
      if (error.meta.target.includes('sheetId_position')) {
        throw new AppError(409, 'Column position already exists in this sheet');
      }
    }
    throw error;
  }
}

async function listBySheet(sheetId) {
  const columns = await prisma.column.findMany({
    where: { sheetId: parseInt(sheetId, 10) },
    orderBy: { position: 'asc' }
  });
  return columns;
}

async function update(id, { name, type, position }) {
  const idInt = parseInt(id, 10);

  if (type && !VALID_TYPES.includes(type)) {
    throw new BadRequestError(`Invalid column type. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (type !== undefined) data.type = type;
  if (position !== undefined) data.position = position;

  try {
    const column = await prisma.column.update({
      where: { id: idInt },
      data
    });
    return column;
  } catch (error) {
    if (error.code === 'P2002') {
      if (error.meta.target.includes('sheetId_name')) {
        throw new AppError(409, 'Column name already exists in this sheet');
      }
      if (error.meta.target.includes('sheetId_position')) {
        throw new AppError(409, 'Column position already exists in this sheet');
      }
    }
    throw error;
  }
}

async function remove(id) {
  await prisma.column.delete({
    where: { id: parseInt(id, 10) }
  });
}

module.exports = {
  create,
  listBySheet,
  update,
  remove
};
