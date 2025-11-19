@echo off
echo.
echo ========================================
echo   MKT Turismo - Create Superadmin User
echo ========================================
echo.
echo This script will create a superadmin user with full system access.
echo.
echo Requirements:
echo - Node.js must be installed
echo - Firebase dependencies must be installed
echo.
echo Press any key to continue...
pause >nul

echo.
echo Running superadmin creation script...
echo.

node scripts/create-superadmin.js

echo.
echo Script execution completed.
echo Press any key to exit...
pause >nul
