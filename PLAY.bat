@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Polyphase needs Node.js 22.12 or newer. Install it from https://nodejs.org
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
start "" "http://127.0.0.1:5173"
call npm run dev
if errorlevel 1 pause
