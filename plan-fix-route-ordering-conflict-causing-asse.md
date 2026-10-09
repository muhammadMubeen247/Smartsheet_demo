# Fix: Route ordering conflict causing `assertRowOwnership` NaN error

## Problem
`GET /sheets/:sheetId/rows/commented` (comments route) is being caught by `GET /sheets/:sheetId/rows/:rowId` (rows route) with `rowId = "commented"`. This causes `parseInt("commented", 10)` → `NaN`, which Prisma rejects as a missing `id`.

## Root Cause
In `app.js`, `rowsRoutes` is mounted at `/sheets` (line 37) **before** `commentsRoutes` at `/` (line 38). Both resolve to `/sheets/...` paths, so the rows wildcard `:rowId` captures `"commented"`.

## Fix

### File: `backend/src/app.js`

Move `commentsRoutes` registration **before** `rowsRoutes`:

```js
// Before (broken):
app.use('/sheets', rowsRoutes);       // line 37
app.use('/', commentsRoutes);         // line 38

// After (fixed):
app.use('/', commentsRoutes);         // comments first — has specific paths like /rows/commented
app.use('/sheets', rowsRoutes);       // rows second — has wildcard /:rowId
```

This ensures `/sheets/:sheetId/rows/commented` is matched by the comments router before the rows router's `/:sheetId/rows/:rowId` can capture it.

## Verification
1. Restart the backend server (`npm run dev`)
2. Open a sheet in the browser — the `commented` endpoint should no longer throw a 500 error
3. Verify the permanent comment icons still appear on commented rows