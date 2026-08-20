@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0set-worker-secrets.ps1" -Environment staging
set "exitCode=%ERRORLEVEL%"
echo.
if not "%exitCode%"=="0" echo Secret setup failed. Review the output above.
if "%exitCode%"=="0" echo Staging Worker secrets are configured.
pause
exit /b %exitCode%
