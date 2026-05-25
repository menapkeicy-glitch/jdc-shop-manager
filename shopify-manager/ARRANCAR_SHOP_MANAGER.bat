@echo off
title JDC Shop Manager - Servidor local
color 0B
cd /d "%~dp0"

echo.
echo  ============================================
echo    JDC Shop Manager - Arrancando servidor
echo  ============================================
echo.

REM Verificar que Node este instalado
where node >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] Node.js no esta instalado.
  echo.
  echo  Descargalo de: https://nodejs.org
  echo  Instala la version LTS y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

REM Lanzar el navegador a los 3 segundos
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3737"

REM Arrancar el servidor (esto bloquea la consola hasta que la cierres)
echo  Abriendo http://localhost:3737 en tu navegador...
echo  El servidor seguira activo hasta que cierres esta ventana.
echo.

node server.js

REM Si llegamos aqui, el servidor se detuvo
echo.
echo  El servidor se detuvo. Presiona cualquier tecla para cerrar.
pause >nul
