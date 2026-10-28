@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8123"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js 가 없습니다. https://nodejs.org 에서 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

echo.
echo   하이츄 서버를 켭니다. 이 창을 닫으면 서버도 꺼집니다.
echo.

start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start "" http://localhost:%PORT%"

node tools/serve.mjs %PORT%

echo.
echo   서버가 멈췄습니다.
pause
