# Plan: Reorganize Workspace into backend/ and frontend/ Directories

## Current Structure
```
C:\Techtimize\
├── node_modules/
├── prisma/
├── src/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── Progress.md
├── README.md
├── test-e2e.ps1
└── test-results.log
```

## Target Structure
```
C:\Techtimize\
├── backend/
│   ├── node_modules/
│   ├── prisma/
│   ├── src/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── test-e2e.ps1
│   └── test-results.log
├── frontend/ (empty for now)
├── Progress.md
└── README.md
```

## Implementation Steps

### Step 1: Stop Running Server
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Create Directory Structure
```powershell
cd C:\Techtimize
New-Item -ItemType Directory -Path "backend" -Force
New-Item -ItemType Directory -Path "frontend" -Force
```

### Step 3: Move Backend Files to backend/
Move all backend-related files and directories:
```powershell
Move-Item -Path "prisma" -Destination "backend\" -Force
Move-Item -Path "src" -Destination "backend\" -Force
Move-Item -Path "node_modules" -Destination "backend\" -Force
Move-Item -Path "package.json" -Destination "backend\" -Force
Move-Item -Path "package-lock.json" -Destination "backend\" -Force
Move-Item -Path ".env" -Destination "backend\" -Force
Move-Item -Path ".env.example" -Destination "backend\" -Force
Move-Item -Path ".gitignore" -Destination "backend\" -Force
Move-Item -Path "test-e2e.ps1" -Destination "backend\" -Force
Move-Item -Path "test-results.log" -Destination "backend\" -ErrorAction SilentlyContinue
```

### Step 4: Update README.md
Update the project structure section in `README.md` to reflect the new monorepo layout with backend/ and frontend/ directories.

### Step 5: Regenerate Prisma Client
```powershell
cd C:\Techtimize\backend
npx prisma generate
```

### Step 6: Start Server and Verify
```powershell
cd C:\Techtimize\backend
npm start
```

### Step 7: Run E2E Tests
```powershell
cd C:\Techtimize\backend
powershell -ExecutionPolicy Bypass -File test-e2e.ps1
```

## Notes
- **Progress.md and README.md** stay at the root as project-level documentation
- **No code changes needed** — all paths in the code are relative and will work after the move
- **The .gitignore** moves to backend/ since it's backend-specific (can create a root .gitignore later if needed for frontend)
- All commands will be run from `C:\Techtimize\backend` going forward
- After verification, all functionality remains intact with the new structure