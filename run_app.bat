@echo off
setlocal

set "FLUTTER_URL=https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.3-stable.zip"
set "INSTALL_DIR=C:\src\flutter"
set "ZIP_FILE=%TEMP%\flutter.zip"

echo Checking for Flutter...
if exist "%INSTALL_DIR%\bin\flutter.bat" (
    echo Flutter is already installed.
) else (
    echo Flutter not found. Installing...
    
    if not exist "C:\src" mkdir "C:\src"
    
    echo Downloading Flutter (this may take a while)...
    powershell -Command "Invoke-WebRequest -Uri '%FLUTTER_URL%' -OutFile '%ZIP_FILE%'"
    
    echo Extracting Flutter...
    powershell -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath 'C:\src' -Force"
    
    del "%ZIP_FILE%"
    echo Flutter installed successfully.
)

echo Adding Flutter to PATH...
set "PATH=%INSTALL_DIR%\bin;%PATH%"

echo Verifying installation...
call flutter --version

echo.
echo Setting up the app...
cd mobile_app
call flutter pub get

echo.
echo Running the app...
call flutter run -d chrome

endlocal
pause
