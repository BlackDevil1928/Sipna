@echo off
title AquaGuardian AI - Launcher
color 0B

echo ============================================
echo    AquaGuardian AI - Starting Services
echo ============================================
echo.

:: Start Backend in a new window
echo [1/2] Launching FastAPI Backend on port 8000...
start "AquaGuardian Backend" cmd /k "cd /d G:\void\Sipna1\backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Brief pause to let backend initialize first
timeout /t 3 /nobreak >nul

:: Start Frontend in a new window
echo [2/2] Launching Vite Frontend on port 5173...
start "AquaGuardian Frontend" cmd /k "cd /d G:\void\Sipna1\frontend && npm run dev"

echo.
echo ============================================
echo    Both services are starting!
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:5173
echo ============================================
echo.
echo You can close this window. The services
echo are running in their own terminals.
pause
