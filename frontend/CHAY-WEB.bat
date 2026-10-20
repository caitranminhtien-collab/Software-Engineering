@echo off
cd /d "%~dp0"
echo Hue Guide - User va Admin da tach rieng
where node >nul 2>nul
if errorlevel 1 (
    echo Khong tim thay Node.js. Vui long cai Node.js va chay lai.
    pause
    exit /b 1
)
node dev-server.js
pause
