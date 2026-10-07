require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const workspacesRoutes = require('./modules/workspaces/workspaces.routes');
const sheetsRoutes = require('./modules/sheets/sheets.routes');
const columnsRoutes = require('./modules/columns/columns.routes');
const rowsRoutes = require('./modules/rows/rows.routes');
const formsRoutes = require('./modules/forms/forms.routes');
const publicFormsRoutes = require('./modules/forms/publicForms.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/workspaces', workspacesRoutes);
app.use('/public/forms', publicFormsRoutes);
app.use('/', sheetsRoutes);
app.use('/sheets', columnsRoutes);
app.use('/sheets', rowsRoutes);
app.use('/', formsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
