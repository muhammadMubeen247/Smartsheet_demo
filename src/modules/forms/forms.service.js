const prisma = require('../../config/db');
const { generateSlug } = require('../../utils/slug');
const { NotFoundError, BadRequestError, AppError } = require('../../utils/errors');

async function create({ sheetId, name, description, fields }) {
  const sheetIdInt = parseInt(sheetId, 10);

  const columns = await prisma.column.findMany({
    where: { sheetId: sheetIdInt }
  });
  const columnIds = new Set(columns.map(c => c.id));

  if (!Array.isArray(fields) || fields.length === 0) {
    throw new BadRequestError('fields must be a non-empty array');
  }

  for (const field of fields) {
    if (!field.columnId) {
      throw new BadRequestError('Each field must have a columnId');
    }
    if (!columnIds.has(field.columnId)) {
      throw new BadRequestError(`Column ID ${field.columnId} does not exist in this sheet`);
    }
    if (typeof field.required !== 'boolean') {
      throw new BadRequestError('Each field must have a boolean "required" property');
    }
  }

  let publicSlug;
  let attempts = 0;
  while (attempts < 5) {
    publicSlug = generateSlug();
    const existing = await prisma.form.findUnique({ where: { publicSlug } });
    if (!existing) break;
    attempts++;
  }

  const form = await prisma.form.create({
    data: {
      sheetId: sheetIdInt,
      name,
      description: description || null,
      fields,
      publicSlug,
      isActive: true
    }
  });

  return form;
}

async function listBySheet(sheetId) {
  const forms = await prisma.form.findMany({
    where: { sheetId: parseInt(sheetId, 10) },
    orderBy: { createdAt: 'desc' }
  });
  return forms;
}

async function getById(id) {
  const form = await prisma.form.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      sheet: {
        include: { columns: { orderBy: { position: 'asc' } } }
      }
    }
  });
  return form;
}

async function update(id, { name, description, fields }) {
  const idInt = parseInt(id, 10);

  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;

  if (fields !== undefined) {
    const form = await prisma.form.findUnique({
      where: { id: idInt },
      include: { sheet: { include: { columns: true } } }
    });

    const columnIds = new Set(form.sheet.columns.map(c => c.id));

    if (!Array.isArray(fields) || fields.length === 0) {
      throw new BadRequestError('fields must be a non-empty array');
    }

    for (const field of fields) {
      if (!field.columnId) {
        throw new BadRequestError('Each field must have a columnId');
      }
      if (!columnIds.has(field.columnId)) {
        throw new BadRequestError(`Column ID ${field.columnId} does not exist in this sheet`);
      }
    }

    data.fields = fields;
  }

  const form = await prisma.form.update({
    where: { id: idInt },
    data
  });

  return form;
}

async function remove(id) {
  await prisma.form.delete({
    where: { id: parseInt(id, 10) }
  });
}

async function toggle(id) {
  const form = await prisma.form.findUnique({
    where: { id: parseInt(id, 10) }
  });

  const updated = await prisma.form.update({
    where: { id: parseInt(id, 10) },
    data: { isActive: !form.isActive }
  });

  return updated;
}

async function getByPublicSlug(slug) {
  const form = await prisma.form.findUnique({
    where: { publicSlug: slug },
    include: {
      sheet: {
        include: { columns: { orderBy: { position: 'asc' } } }
      }
    }
  });

  if (!form || !form.isActive) {
    throw new NotFoundError('Form not found or not active');
  }

  return {
    name: form.name,
    description: form.description,
    fields: form.fields,
    columns: form.sheet.columns.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      position: c.position
    }))
  };
}

async function submitByPublicSlug(slug, values) {
  const form = await prisma.form.findUnique({
    where: { publicSlug: slug },
    include: {
      sheet: {
        include: { columns: true }
      }
    }
  });

  if (!form || !form.isActive) {
    throw new NotFoundError('Form not found or not active');
  }

  const columnMap = new Map();
  form.sheet.columns.forEach(col => {
    columnMap.set(col.id, col);
  });

  const fieldColumnIds = new Set(form.fields.map(f => f.columnId));
  const errors = [];
  const validated = {};

  for (const field of form.fields) {
    const key = String(field.columnId);
    const value = values[key];

    if (value === undefined || value === null || value === '') {
      if (field.required) {
        const col = columnMap.get(field.columnId);
        errors.push(`Field "${col ? col.name : field.columnId}" is required`);
      }
      continue;
    }

    const column = columnMap.get(field.columnId);
    if (!column) {
      errors.push(`Column ID ${field.columnId} not found`);
      continue;
    }

    const validationError = validateType(value, column.type, column.name);
    if (validationError) {
      errors.push(validationError);
    } else {
      validated[field.columnId] = value;
    }
  }

  for (const key of Object.keys(values)) {
    const colId = parseInt(key, 10);
    if (!fieldColumnIds.has(colId)) {
      errors.push(`Field with column ID ${key} is not part of this form`);
    }
  }

  if (errors.length > 0) {
    throw new BadRequestError(`Validation failed: ${errors.join(', ')}`);
  }

  const row = await prisma.row.create({
    data: {
      sheetId: form.sheetId,
      values: validated
    }
  });

  return row;
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

module.exports = {
  create,
  listBySheet,
  getById,
  update,
  remove,
  toggle,
  getByPublicSlug,
  submitByPublicSlug
};
