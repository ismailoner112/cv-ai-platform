@echo off
echo CV AI6 Projesi Baslatiliyor...

:: MongoDB'nin çalışıp çalışmadığını kontrol et
echo MongoDB kontrol ediliyor...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: MongoDB yuklu degil veya calismiyor!
    echo Lutfen MongoDB'yi yukleyin ve baslatın.
    pause
    exit /b 1
)

:: Gerekli klasörleri oluştur
echo Gerekli klasorler olusturuluyor...
if not exist "uploads" mkdir uploads
if not exist "uploads\gallery" mkdir uploads\gallery
if not exist "uploads\announcements" mkdir uploads\announcements

:: Backend bağımlılıklarını yükle
echo Backend bagimliliklari yukleniyor...
call npm install
if %errorlevel% neq 0 (
    echo HATA: Backend bagimliliklari yuklenemedi!
    pause
    exit /b 1
)

:: Frontend bağımlılıklarını yükle
echo Frontend bagimliliklari yukleniyor...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo HATA: Frontend bagimliliklari yuklenemedi!
    cd ..
    pause
    exit /b 1
)
cd ..

:: Backend'i başlat
echo Backend baslatiliyor...
start cmd /k "npm run dev"

:: Frontend'i başlat
echo Frontend baslatiliyor...
cd frontend
npm start
cd ..

echo.
echo Proje baslatildi!
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Tarayicinizda http://localhost:3000 adresini acin.
echo.
echo Projeyi durdurmak icin tum cmd pencerelerini kapatın.
echo.

pause 

net start MongoDB 

cd C:\Users\İSO\Desktop\cv-ai-main