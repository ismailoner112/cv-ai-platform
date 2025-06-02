#!/bin/bash

echo "CV AI6 Projesi Durduruluyor..."

# Node.js işlemlerini sonlandır
echo "Node.js işlemleri sonlandırılıyor..."
pkill -f node

# MongoDB'yi durdur
echo "MongoDB durduruluyor..."
brew services stop mongodb-community@6.0 2>/dev/null || \
pkill -f mongod

echo ""
echo "Proje durduruldu!"
echo ""
read -n 1 -s -r -p "Devam etmek için bir tuşa basın..."