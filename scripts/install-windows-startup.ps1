$ErrorActionPreference = "Stop"

$startup = [Environment]::GetFolderPath("Startup")
$batTarget = Join-Path $startup "BrSE OS.bat"

$content = @"
@echo off
echo [BrSE] Starting WSL services (9router, Docker stack)...
wsl.exe --cd /home/bakaryuu/BrSE -- bash scripts/start-brse-stack.sh
"@
Set-Content -Path $batTarget -Value $content -Encoding ASCII

Write-Host "Installed BrSE OS startup launcher:"
Write-Host $batTarget
Write-Host ""
Write-Host "It will run Ollama, Docker Compose + 9router after Windows login."
