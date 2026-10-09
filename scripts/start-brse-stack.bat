@echo off
REM Put a shortcut to this file in Windows Startup if you want BrSE OS to start after login.
echo [BrSE] Starting WSL services (9router, Docker stack)...
wsl.exe --cd /home/bakaryuu/BrSE -- bash scripts/start-brse-stack.sh

