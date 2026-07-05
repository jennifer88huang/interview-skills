@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo CreateObject("WScript.Shell").Run "node extensions\server.js", 0, False > %TEMP%\start-interview.vbs
cscript //nologo %TEMP%\start-interview.vbs
del %TEMP%\start-interview.vbs
start http://localhost:3000/ui/
exit
