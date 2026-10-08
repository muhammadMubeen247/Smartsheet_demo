const prisma = require('../../config/db');
const { AppError, BadRequestError } = require('../../utils/errors');

const VALID_TYPES = ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE'];

async function create({ sheetId, name, type, position }) {
  const sheetIdInt = parseInt(sheetId, 10);
  
  if (!VALID_TYPES.includes(type)) {
    throw new BadRequestError(`Invalid column type. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  const maxPosition = await prisma.column.aggregate({
    where: { sheetId: sheetIdInt },
    _max: { position: true }
  });
  position = (maxPosition._max.position ?? -1) + 1;

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
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join('_') : (error.meta?.target || '');
      if (target.includes('name')) {
        throw new AppError(409, 'A column with this name already exists in this sheet');
      }
      if (target.includes('position')) {
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
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join('_') : (error.meta?.target || '');
      if (target.includes('name')) {
        throw new AppError(409, 'A column with this name already exists in this sheet');
      }
      if (target.includes('position')) {
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

async function insert(sheetId, columnId, direction, { name, type } = {}) {
  const sheetIdInt = parseInt(sheetId, 10);
  const colIdInt = parseInt(columnId, 10);

  const target = await prisma.column.findUnique({
    where: { id: colIdInt }
  });
  if (!target) throw new BadRequestError('Column not found');

  const insertPosition = direction === 'left' ? target.position : target.position + 1;

  // Shift columns in two steps to avoid unique constraint violation during the update.
  // Step 1: add a large temporary offset to all positions at or after insertPosition
  // Step 2: subtract the offset minus 1, effectively shifting them by +1
  const TEMP_OFFSET = 100000;
  await prisma.$executeRaw`
    UPDATE "columns" SET position = position + ${TEMP_OFFSET}
    WHERE "sheetId" = ${sheetIdInt} AND position >= ${insertPosition}
  `;
  await prisma.$executeRaw`
    UPDATE "columns" SET position = position - ${TEMP_OFFSET - 1}
    WHERE "sheetId" = ${sheetIdInt} AND position >= ${insertPosition + TEMP_OFFSET}
  `;

  // Use provided name or generate a unique one
  let columnName = name;
  if (!columnName) {
    const existingNames = await prisma.column.findMany({
      where: { sheetId: sheetIdInt },
      select: { name: true }
    });
    const nameSet = new Set(existingNames.map(c => c.name));
    columnName = 'Column';
    let counter = 1;
    while (nameSet.has(columnName)) {
      columnName = `Column ${counter}`;
      counter++;
    }
  }

  // Use provided type or default to TEXT
  if (type && !VALID_TYPES.includes(type)) {
    throw new BadRequestError(`Invalid column type. Must be one of: ${VALID_TYPES.join(', ')}`);
  }
  const columnType = type || 'TEXT';

  const column = await prisma.column.create({
    data: { sheetId: sheetIdInt, name: columnName, type: columnType, position: insertPosition }
  });
  return column;
}

module.exports = {
  create,
  listBySheet,
  update,
  remove,
  insert
};
