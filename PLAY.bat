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
if /i "%~1"=="lan" (
  echo Open one of the Network addresses below on your phone using the same local network.
  call npm run dev:lan
) else (
  call npm run dev
)
if errorlevel 1 pause
