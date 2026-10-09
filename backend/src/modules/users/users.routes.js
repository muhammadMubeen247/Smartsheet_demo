const express = require('express');
const auth = require('../../middleware/auth');
const usersController = require('./users.controller');

const router = express.Router();

router.use(auth);

router.get('/search', usersController.search);

module.exports = router;
