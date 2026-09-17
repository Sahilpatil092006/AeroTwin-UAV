@echo off
setlocal enabledelayedexpansion
title AeroTwin-UAV Launcher

echo [AeroTwin-UAV]
echo ============================================================
echo   AeroTwin-UAV Autonomous Digital Twin System Launcher
echo ============================================================
echo.

REM 1. Detect project root and normalize path (strip trailing backslash)
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%"
set "PYTHONPATH=%PROJECT_ROOT%"

REM 2. Check Python
echo Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10 or newer and ensure it is added to PATH.
    echo.
    pause
    exit /b 1
)

REM 3. Check Node.js and npm
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js and ensure it is added to PATH.
    echo.
    pause
    exit /b 1
)

call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH!
    echo.
    pause
    exit /b 1
)

REM 4. Check backend dependencies
echo Checking backend...
python -c "import fastapi, uvicorn, websockets, pydantic, sqlalchemy, aiosqlite, numpy, pandas, sklearn, scipy, joblib" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing backend dependencies from backend\requirements.txt...
    python -m pip install -r "%PROJECT_ROOT%\backend\requirements.txt"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install backend dependencies!
        echo.
        pause
        exit /b 1
    )
)

REM 5. Check frontend dependencies
if not exist "%PROJECT_ROOT%\frontend\node_modules" (
    echo Installing frontend dependencies with npm install...
    pushd "%PROJECT_ROOT%\frontend"
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed for frontend!
        popd
        echo.
        pause
        exit /b 1
    )
    popd
)

REM 6. Check if backend on port 8000 is already responding
curl.exe -s --max-time 2 http://localhost:8000/api/health | findstr /i "ok" >nul 2>&1
if not errorlevel 1 goto backend_already_running
curl.exe -s --max-time 2 http://127.0.0.1:8000/api/health | findstr /i "ok" >nul 2>&1
if not errorlevel 1 goto backend_already_running

echo Starting backend...
start "AeroTwin-UAV Backend - Port 8000" cmd /k "cd /d ""%PROJECT_ROOT%"" && set ""PYTHONPATH=%PROJECT_ROOT%"" && python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend...
set "BACKEND_ATTEMPTS=0"

:wait_backend
set /a BACKEND_ATTEMPTS+=1

REM Check 1: HTTP API health endpoint returns status ok
curl.exe -s --max-time 2 http://localhost:8000/api/health | findstr /i "ok" >nul 2>&1
if not errorlevel 1 goto verify_ws_stream
curl.exe -s --max-time 2 http://127.0.0.1:8000/api/health | findstr /i "ok" >nul 2>&1
if not errorlevel 1 goto verify_ws_stream

if %BACKEND_ATTEMPTS% geq 45 goto backend_timeout
ping 127.0.0.1 -n 2 >nul
goto wait_backend

:verify_ws_stream
REM Check 2: Verify WebSocket endpoint accepts connection and initial handshake
python -c "import asyncio, websockets; asyncio.run(asyncio.wait_for(websockets.connect('ws://localhost:8000/ws/telemetry'), timeout=2.0))" >nul 2>&1
if not errorlevel 1 goto backend_is_up
python -c "import asyncio, websockets; asyncio.run(asyncio.wait_for(websockets.connect('ws://127.0.0.1:8000/ws/telemetry'), timeout=2.0))" >nul 2>&1
if not errorlevel 1 goto backend_is_up

if %BACKEND_ATTEMPTS% geq 45 goto backend_timeout
ping 127.0.0.1 -n 2 >nul
goto wait_backend

:backend_timeout
echo.
echo [ERROR] FastAPI backend failed to start at http://localhost:8000/api/health!
echo Diagnostics:
curl.exe -v --max-time 2 http://localhost:8000/api/health
echo.
echo Please check the backend console window for error messages.
echo.
pause
exit /b 1

:backend_already_running
echo Backend is already running and responding. Reusing active instance.
goto backend_done

:backend_is_up
:backend_done
echo Backend READY

REM 7. Check if frontend on port 3000 is already responding
curl.exe -s --max-time 2 http://localhost:3000 | findstr /i "html" >nul 2>&1
if not errorlevel 1 goto frontend_already_running
curl.exe -s --max-time 2 http://127.0.0.1:3000 | findstr /i "html" >nul 2>&1
if not errorlevel 1 goto frontend_already_running

echo Starting frontend...
start "AeroTwin-UAV Frontend - Port 3000" cmd /k "cd /d ""%PROJECT_ROOT%\frontend"" && npm run dev"

echo Waiting for frontend...
set "FRONTEND_ATTEMPTS=0"

:wait_frontend
set /a FRONTEND_ATTEMPTS+=1
curl.exe -s --max-time 2 http://localhost:3000 | findstr /i "html" >nul 2>&1
if not errorlevel 1 goto frontend_is_up
curl.exe -s --max-time 2 http://127.0.0.1:3000 | findstr /i "html" >nul 2>&1
if not errorlevel 1 goto frontend_is_up

if %FRONTEND_ATTEMPTS% geq 45 goto frontend_timeout
ping 127.0.0.1 -n 2 >nul
goto wait_frontend

:frontend_timeout
echo.
echo [ERROR] Frontend failed to respond at http://localhost:3000!
echo Diagnostics:
curl.exe -v --max-time 2 http://localhost:3000
echo.
echo Please check the frontend console window for error messages.
echo.
pause
exit /b 1

:frontend_already_running
echo Frontend is already running at http://localhost:3000. Reusing active instance.
goto frontend_done

:frontend_is_up
:frontend_done
echo Frontend READY

REM 8. Open browser ONLY after both are confirmed ready
echo Opening AeroTwin Dashboard...
start "" "http://localhost:3000/dashboard"

echo.
echo ============================================================
echo   [SUCCESS] AeroTwin-UAV is online!
echo   Dashboard:  http://localhost:3000/dashboard
echo   API Docs:   http://localhost:8000/docs
echo   WebSocket:  ws://localhost:8000/ws/telemetry
echo ============================================================
echo Keep background server windows open while using AeroTwin-UAV.
echo Press any key to exit this launcher window...
pause >nul
exit /b 0
