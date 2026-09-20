@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado.
  echo Instale o Node.js em https://nodejs.org/ e tente novamente.
  pause
  exit /b 1
)

if not exist "node_modules\electron" (
  echo Primeira execucao: instalando dependencias...
  call npm.cmd install
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

call npm.cmd start
if errorlevel 1 (
  echo.
  echo O navegador nao conseguiu iniciar.
  pause
)
endlocal