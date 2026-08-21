@echo off
setlocal
cd /d "%~dp0.."
echo This will replace BETTER_AUTH_SECRET, EVENT_PROCESSOR_TOKEN, and MEDIA_SIGNING_SECRET for PRODUCTION.
choice /C YN /N /M "Continue? [Y/N] "
if errorlevel 2 exit /b 0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0set-worker-secrets.ps1" -Environment production
set "exitCode=%ERRORLEVEL%"
echo.
if not "%exitCode%"=="0" echo Secret setup failed. Review the output above.
if "%exitCode%"=="0" echo Production Worker secrets are configured.
pause
exit /b %exitCode%
