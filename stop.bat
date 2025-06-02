@echo off
echo CV AI6 Projesi Durduruluyor...

:: Node.js işlemlerini sonlandır
echo Node.js islemleri sonlandiriliyor...
taskkill /F /IM node.exe >nul 2>&1

:: MongoDB'yi durdur
echo MongoDB durduruluyor...
taskkill /F /IM mongod.exe >nul 2>&1

echo.
echo Proje durduruldu!
echo.
pause 