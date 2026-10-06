const prisma = require('../../config/db');

async function create({ name, ownerId }) {
  const workspace = await prisma.workspace.create({
    data: { name, ownerId }
  });
  return workspace;
}

async function listByOwner(ownerId) {
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' }
  });
  return workspaces;
}

async function getById(id) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: parseInt(id, 10) },
    include: { sheets: true }
  });
  return workspace;
}

async function update(id, { name }) {
  const workspace = await prisma.workspace.update({
    where: { id: parseInt(id, 10) },
    data: { name }
  });
  return workspace;
}

async function remove(id) {
  await prisma.workspace.delete({
    where: { id: parseInt(id, 10) }
  });
}

module.exports = {
  create,
  listByOwner,
  getById,
  update,
  remove
};
