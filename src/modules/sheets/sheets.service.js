const prisma = require('../../config/db');

async function create({ name, workspaceId }) {
  const sheet = await prisma.sheet.create({
    data: { name, workspaceId: parseInt(workspaceId, 10) }
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
