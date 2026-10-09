@echo off
chcp 65001 >nul
echo ========================================================
echo   [BrSE OS] Kiem tra va khoi dong Backend & Frontend qua PM2
echo ========================================================

cd /d "%~dp0"

where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo [BrSE OS] Chua tim thay PM2 tren he thong. Dang tien hanh cai dat PM2 toan cuc qua npm...
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo [BrSE OS] Khong the cai dat PM2 toan cuc. Dang chuyen sang dung npx pm2...
        set PM2_CMD=npx --yes pm2
    ) else (
        set PM2_CMD=pm2
    )
) else (
    set PM2_CMD=pm2
)

echo.
echo [BrSE OS] Dang khoi chay qua %PM2_CMD%...
call %PM2_CMD% start ecosystem.config.cjs
call %PM2_CMD% save

echo.
echo ========================================================
echo [BrSE OS] Da khoi dong thanh cong!
echo - Backend (API):   http://127.0.0.1:8000
echo - Frontend (UI):   http://127.0.0.1:3010
echo ========================================================
echo.
call %PM2_CMD% status
pause
