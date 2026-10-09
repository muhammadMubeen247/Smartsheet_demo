const usersService = require('./users.service');
const { BadRequestError } = require('../../utils/errors');

async function search(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw new BadRequestError('Query must be at least 2 characters');
    }

    const users = await usersService.searchByEmail({
      query: q.trim(),
      excludeUserId: req.user.id,
    });

    res.json({ data: users });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  search,
};
