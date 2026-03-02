@echo off
echo 🚀 Starting Health Index App...
echo ⚡ Skipping package download check for speed...

REM --no-pub: Skips "flutter pub get" to save time
REM -d web-server: Runs in web server mode
REM --web-hostname: Sets the IP so you can access it from your phone

D:\FYP\Health_Index\flutter\bin\flutter.bat run -d web-server --web-hostname 192.168.100.15 --no-pub
