const prisma = require('../../config/db');
const { BadRequestError } = require('../../utils/errors');

async function validateValues(sheetId, values) {
  const columns = await prisma.column.findMany({
    where: { sheetId: parseInt(sheetId, 10) }
  });

  const columnMap = new Map();
  columns.forEach(col => {
    columnMap.set(col.id, col);
  });

  const validated = {};
  const errors = [];

  for (const [key, value] of Object.entries(values)) {
    const columnId = parseInt(key, 10);
    
    if (isNaN(columnId)) {
      errors.push(`Invalid column ID: ${key}`);
      continue;
    }

    const column = columnMap.get(columnId);
    if (!column) {
      errors.push(`Column ID ${columnId} does not exist in this sheet`);
      continue;
    }

    const validationError = validateType(value, column.type, column.name);
    if (validationError) {
      errors.push(validationError);
    } else {
      validated[columnId] = value;
    }
  }

  if (errors.length > 0) {
    throw new BadRequestError(`Validation failed: ${errors.join(', ')}`);
  }

  return validated;
}

function validateType(value, type, columnName) {
  switch (type) {
    case 'TEXT':
      if (typeof value !== 'string') {
        return `Column "${columnName}" expects TEXT but got ${typeof value}`;
      }
      break;
    
    case 'NUMBER':
      if (typeof value !== 'number' || !isFinite(value)) {
        return `Column "${columnName}" expects NUMBER but got ${typeof value}`;
      }
      break;
    
    case 'BOOLEAN':
      if (typeof value !== 'boolean') {
        return `Column "${columnName}" expects BOOLEAN but got ${typeof value}`;
      }
      break;
    
    case 'DATE':
      if (typeof value !== 'string') {
        return `Column "${columnName}" expects DATE (ISO string) but got ${typeof value}`;
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return `Column "${columnName}" expects valid DATE (ISO format)`;
      }
      break;
  }
  return null;
}

async function create({ sheetId, values }) {
  const validatedValues = await validateValues(sheetId, values);
  
  const row = await prisma.row.create({
    data: {
      sheetId: parseInt(sheetId, 10),
      values: validatedValues
    }
  });
  
  return row;
}

async function listBySheet(sheetId) {
  const rows = await prisma.row.findMany({
    where: { sheetId: parseInt(sheetId, 10) },
    orderBy: { createdAt: 'desc' }
  });
  return rows;
}

async function getById(id) {
  const row = await prisma.row.findUnique({
    where: { id: parseInt(id, 10) }
  });
  return row;
}

async function update(id, { values }) {
  const existing = await prisma.row.findUnique({
    where: { id: parseInt(id, 10) }
  });
  
  if (!existing) {
    throw new BadRequestError('Row not found');
  }

  const validatedValues = await validateValues(existing.sheetId, values);
  
  const row = await prisma.row.update({
    where: { id: parseInt(id, 10) },
    data: { values: validatedValues }
  });
  
  return row;
}

async function remove(id) {
  await prisma.row.delete({
    where: { id: parseInt(id, 10) }
  });
}

module.exports = {
  create,
  listBySheet,
  getById,
  update,
  remove
};
