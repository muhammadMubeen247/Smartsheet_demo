require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const workspaceSharingRoutes = require('./modules/workspace-sharing/workspaces-shared.routes');
const workspacesRoutes = require('./modules/workspaces/workspaces.routes');
const sheetsRoutes = require('./modules/sheets/sheets.routes');
const columnsRoutes = require('./modules/columns/columns.routes');
const rowsRoutes = require('./modules/rows/rows.routes');
const formsRoutes = require('./modules/forms/forms.routes');
const publicFormsRoutes = require('./modules/forms/publicForms.routes');
const sharesRoutes = require('./modules/sharing/shares.routes');
const commentsRoutes = require('./modules/comments/comments.routes');
const usersRoutes = require('./modules/users/users.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
// Workspace sharing routes MUST come before workspaces routes so /workspaces/shared-with-me doesn't match /:workspaceId
app.use('/workspaces', workspaceSharingRoutes);
app.use('/workspaces', workspacesRoutes);
app.use('/public/forms', publicFormsRoutes);
// Shares routes MUST come before sheets so /sheets/shared-with-me doesn't match /sheets/:id
app.use('/sheets', sharesRoutes);
app.use('/', sheetsRoutes);
app.use('/sheets', columnsRoutes);
app.use('/sheets', rowsRoutes);
app.use('/', commentsRoutes);
app.use('/', formsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
