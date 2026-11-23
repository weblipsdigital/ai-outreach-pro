@echo off
REM ==============================================================================
REM AI Outreach Pro - Windows One-Click Local Launcher
REM ==============================================================================

echo [AI Outreach Pro] Initializing local environment on Windows localhost...

cd /d "%~dp0\.."

if not exist "backend\.env" (
    echo [Setup] Creating backend\.env from template...
    copy ".env.example" "backend\.env"
)

echo [Setup] Synchronizing SQLite Database with Prisma...
cd backend
call npx prisma db push
call npm run db:seed
cd ..

echo [Startup] Starting AI Outreach Pro (Backend Port 5000 + Frontend Port 5173)...
npm run dev
