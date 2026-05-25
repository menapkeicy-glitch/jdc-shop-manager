@echo off
title Subir Shop Manager a GitHub
color 0B
cd /d "%~dp0"

echo.
echo  ============================================
echo    Subiendo Shop Manager a GitHub
echo  ============================================
echo.

REM Verificar que git este instalado
where git >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] Git no esta instalado.
  echo.
  echo  Descargalo de: https://git-scm.com/download/win
  echo  Instala con todos los valores por defecto y vuelve a ejecutar.
  echo.
  pause
  exit /b 1
)

REM Configuracion del repo (auto-detectada)
set REPO_USER=menapkeicy-glitch
set REPO_NAME=jdc-shop-manager
set REPO_URL=https://github.com/%REPO_USER%/%REPO_NAME%.git

echo  Repo destino: %REPO_URL%
echo.

REM Verificar si ya existe remote
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo  Agregando remote origin...
  git remote add origin %REPO_URL%
) else (
  echo  Remote origin ya configurado, actualizando URL...
  git remote set-url origin %REPO_URL%
)

echo.
echo  Subiendo codigo a GitHub...
echo  (Si te pide login, autoriza en la ventana que se abrira en el navegador)
echo  NOTA: usando --force para reemplazar archivos subidos manualmente.
echo.

git push -u --force origin main

if errorlevel 1 (
  echo.
  echo  [ERROR] No se pudo subir.
  echo.
  echo  Posibles causas:
  echo   1. Aun no creaste el repo "jdc-shop-manager" en GitHub
  echo      - Ve a github.com/new y creale ese nombre exacto
  echo   2. No te autenticaste en la ventana del navegador
  echo      - Vuelve a ejecutar este archivo
  echo   3. El repo ya tiene contenido (collision)
  echo      - Avisame para resolver
  echo.
  pause
  exit /b 1
)

echo.
echo  ============================================
echo    SUBIDO CON EXITO
echo  ============================================
echo.
echo  Tu codigo ya esta en:
echo  https://github.com/%REPO_USER%/%REPO_NAME%
echo.
echo  SIGUIENTE PASO:
echo   Avisame para conectar Netlify (~5 minutos)
echo.

REM Abrir el repo en el navegador para verificar
start "" https://github.com/%REPO_USER%/%REPO_NAME%

pause
