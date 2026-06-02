@echo off
title SD-WAN Demo

echo ================================
echo   SD-WAN Demo
echo ================================
echo.

:: start backend (new window)
echo [1/2] Starting backend (port 9101)...
start "SD-WAN Backend" cmd /k "cd /d %~dp0backend && if not exist .venv\Scripts\activate.bat (echo ERROR: .venv not found! Run: python -m venv .venv ^&^& .venv\Scripts\activate ^&^& pip install -r requirements.txt ^&^& pause) else (.venv\Scripts\activate ^&^& uvicorn main:app --reload --port 9101)"

:: wait for backend
timeout /t 2 /nobreak >nul

:: start frontend (new window)
echo [2/2] Starting frontend (port 5273)...
start "SD-WAN Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================
echo   Frontend: http://localhost:5273
echo   Backend:  http://localhost:9101
echo   API Docs: http://localhost:9101/docs
echo ================================
echo.
echo Close this window does NOT stop the services.
pause
