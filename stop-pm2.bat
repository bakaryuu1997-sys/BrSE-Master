@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [BrSE OS] Dang dung tien trinh brse-backend va brse-frontend...

where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    set PM2_CMD=npx --yes pm2
) else (
    set PM2_CMD=pm2
)

call %PM2_CMD% stop brse-backend brse-frontend
echo.
call %PM2_CMD% status
pause
