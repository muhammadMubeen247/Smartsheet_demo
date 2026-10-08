const prisma = require('../../config/db');

async function create({ name, workspaceId }) {
  const sheet = await prisma.$transaction(async (tx) => {
    const created = await tx.sheet.create({
      data: { name, workspaceId: parseInt(workspaceId, 10) }
    });

    // Create 6 default columns
    const defaultCols = [
      { name: 'Primary Column', type: 'TEXT', position: 0 },
      { name: 'Column 2', type: 'TEXT', position: 1 },
      { name: 'Column 3', type: 'TEXT', position: 2 },
      { name: 'Column 4', type: 'TEXT', position: 3 },
      { name: 'Column 5', type: 'TEXT', position: 4 },
      { name: 'Column 6', type: 'TEXT', position: 5 },
    ];

    for (const col of defaultCols) {
      await tx.column.create({
        data: { ...col, sheetId: created.id }
      });
    }

    // Create 50 empty rows
    const rows = [];
    for (let i = 0; i < 50; i++) {
      rows.push({ sheetId: created.id, values: {} });
    }
    await tx.row.createMany({ data: rows });

    return created;
  });

  return sheet;
}

async function listByWorkspace(workspaceId) {
  const sheets = await prisma.sheet.findMany({
    where: { workspaceId: parseInt(workspaceId, 10) },
    orderBy: { createdAt: 'desc' }
  });
  return sheets;
}

async function getById(id) {
  const sheet = await prisma.sheet.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      columns: { orderBy: { position: 'asc' } },
      _count: { select: { rows: true } }
    }
  });
  return sheet;
}

async function update(id, { name }) {
  const sheet = await prisma.sheet.update({
    where: { id: parseInt(id, 10) },
    data: { name }
  });
  return sheet;
}

async function remove(id) {
  await prisma.sheet.delete({
    where: { id: parseInt(id, 10) }
  });
}

module.exports = {
  create,
  listByWorkspace,
  getById,
  update,
  remove
};
