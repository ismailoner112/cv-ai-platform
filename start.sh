#!/bin/bash

echo "CV AI6 Projesi Başlatılıyor..."

# MongoDB kontrolü
echo "MongoDB kontrol ediliyor..."
if ! command -v mongod &> /dev/null; then
    echo "HATA: MongoDB yüklü değil veya çalışmıyor!"
    echo "Lütfen MongoDB'yi yükleyin ve başlatın."
    echo "Homebrew ile kurmak için: brew install mongodb-community@6.0"
    exit 1
fi

# Klasörleri oluştur
echo "Gerekli klasörler oluşturuluyor..."
mkdir -p uploads/gallery
mkdir -p uploads/announcements

# Backend bağımlılıkları
echo "Backend bağımlılıkları yükleniyor..."
npm install
if [ $? -ne 0 ]; then
    echo "HATA: Backend bağımlılıkları yüklenemedi!"
    exit 1
fi

# Frontend bağımlılıkları
echo "Frontend bağımlılıkları yükleniyor..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "HATA: Frontend bağımlılıkları yüklenemedi!"
    cd ..
    exit 1
fi
cd ..

# Backend'i arka planda başlat
echo "Backend başlatılıyor..."
npm run dev &

# Frontend'i başlat
echo "Frontend başlatılıyor..."
cd frontend
npm start &
cd ..

echo ""
echo "Proje başlatıldı!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Tarayıcınızda http://localhost:3000 adresini açın."
echo ""
echo "Projeyi durdurmak için:"
echo "1. Bu terminal penceresini kapatmayın"
echo "2. Yeni terminalde 'pkill -f node' komutunu çalıştırın"
echo ""