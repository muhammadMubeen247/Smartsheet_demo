const sharesService = require('./shares.service');
const { assertIsOwner } = require('./permissions.service');

async function create(req, res, next) {
  try {
    const { sheetId } = req.params;
    const { email, permission } = req.body;

    await assertIsOwner(sheetId, req.user.id);
    const share = await sharesService.create({ sheetId, email, permission });

    res.status(201).json({ data: share });
  } catch (error) {
    next(error);
  }
}

async function listBySheet(req, res, next) {
  try {
    const { sheetId } = req.params;
    await assertIsOwner(sheetId, req.user.id);
    const shares = await sharesService.listBySheet(sheetId);
    res.json({ data: shares, count: shares.length });
  } catch (error) {
    next(error);
  }
}

async function updateShare(req, res, next) {
  try {
    const { sheetId, shareId } = req.params;
    const { permission } = req.body;

    await assertIsOwner(sheetId, req.user.id);
    const share = await sharesService.updateShare({ sheetId, shareId, permission });

    res.json({ data: share });
  } catch (error) {
    next(error);
  }
}

async function removeShare(req, res, next) {
  try {
    const { sheetId, shareId } = req.params;
    await assertIsOwner(sheetId, req.user.id);
    await sharesService.removeShare({ sheetId, shareId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function listSharedWithMe(req, res, next) {
  try {
    const sheets = await sharesService.listSharedWithMe(req.user.id);
    res.json({ data: sheets, count: sheets.length });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  listBySheet,
  updateShare,
  removeShare,
  listSharedWithMe
};
