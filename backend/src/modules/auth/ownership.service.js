const prisma = require('../../config/db');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

async function assertWorkspaceOwnership(workspaceId, userId) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: parseInt(workspaceId, 10) }
  });

  if (!workspace) {
    throw new NotFoundError('Workspace not found');
  }

  if (workspace.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this workspace');
  }

  return workspace;
}

async function assertSheetOwnership(sheetId, userId) {
  const sheet = await prisma.sheet.findUnique({
    where: { id: parseInt(sheetId, 10) },
    include: { workspace: true }
  });

  if (!sheet) {
    throw new NotFoundError('Sheet not found');
  }

  if (sheet.workspace.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this sheet');
  }

  return sheet;
}

async function assertColumnOwnership(columnId, userId) {
  const column = await prisma.column.findUnique({
    where: { id: parseInt(columnId, 10) },
    include: { sheet: { include: { workspace: true } } }
  });

  if (!column) {
    throw new NotFoundError('Column not found');
  }

  return column;
}

async function assertRowOwnership(rowId, userId) {
  const row = await prisma.row.findUnique({
    where: { id: parseInt(rowId, 10) },
    include: { sheet: { include: { workspace: true } } }
  });

  if (!row) {
    throw new NotFoundError('Row not found');
  }

  return row;
}

async function assertFormOwnership(formId, userId) {
  const form = await prisma.form.findUnique({
    where: { id: parseInt(formId, 10) },
    include: { sheet: { include: { workspace: true } } }
  });

  if (!form) {
    throw new NotFoundError('Form not found');
  }

  if (form.sheet.workspace.ownerId !== userId) {
    throw new ForbiddenError('You do not have access to this form');
  }

  return form;
}

module.exports = {
  assertWorkspaceOwnership,
  assertSheetOwnership,
  assertColumnOwnership,
  assertRowOwnership,
  assertFormOwnership
};
