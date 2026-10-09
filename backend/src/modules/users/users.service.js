const prisma = require('../../config/db');

const MAX_RESULTS = 5;

async function searchByEmail({ query, excludeUserId }) {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: query,
        mode: 'insensitive',
      },
      NOT: {
        id: excludeUserId,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    take: MAX_RESULTS,
    orderBy: {
      email: 'asc',
    },
  });

  return users;
}

module.exports = {
  searchByEmail,
};
