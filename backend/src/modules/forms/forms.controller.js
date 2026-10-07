const formsService = require('./forms.service');
const { assertSheetOwnership, assertFormOwnership } = require('../auth/ownership.service');

async function create(req, res, next) {
  try {
    const { sheetId } = req.params;
    const { name, description, fields } = req.body;

    await assertSheetOwnership(sheetId, req.user.id);
    const form = await formsService.create({ sheetId, name, description, fields });

    res.status(201).json({ data: form });
  } catch (error) {
    next(error);
  }
}

async function listBySheet(req, res, next) {
  try {
    const { sheetId } = req.params;
    await assertSheetOwnership(sheetId, req.user.id);
    const forms = await formsService.listBySheet(sheetId);
    res.json({ data: forms, count: forms.length });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { formId } = req.params;
    await assertFormOwnership(formId, req.user.id);
    const form = await formsService.getById(formId);
    res.json({ data: form });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { formId } = req.params;
    const { name, description, fields } = req.body;

    await assertFormOwnership(formId, req.user.id);
    const form = await formsService.update(formId, { name, description, fields });

    res.json({ data: form });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { formId } = req.params;
    await assertFormOwnership(formId, req.user.id);
    await formsService.remove(formId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function toggle(req, res, next) {
  try {
    const { formId } = req.params;
    await assertFormOwnership(formId, req.user.id);
    const form = await formsService.toggle(formId);
    res.json({ data: form });
  } catch (error) {
    next(error);
  }
}

async function getPublicForm(req, res, next) {
  try {
    const { slug } = req.params;
    const form = await formsService.getByPublicSlug(slug);
    res.json({ data: form });
  } catch (error) {
    next(error);
  }
}

async function submitPublicForm(req, res, next) {
  try {
    const { slug } = req.params;
    const { values } = req.body;
    const row = await formsService.submitByPublicSlug(slug, values);
    res.status(201).json({ data: { id: row.id, message: 'Submission received' } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  listBySheet,
  getById,
  update,
  remove,
  toggle,
  getPublicForm,
  submitPublicForm
};
