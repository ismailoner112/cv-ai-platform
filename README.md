# CV AI6 - CV Analiz ve Firma Eşleştirme Platformu

Bu proje, yapay zeka destekli CV analizi ve firma eşleştirme platformudur. 
Kullanıcılar CV'lerini yükleyebilir, firma web sitelerini analiz edebilir ve uyumluluk skorlarını görebilirler.

## Özellikler

- CV Analizi
- Firma Web Sitesi Analizi
- Uyumluluk Skoru Hesaplama
- Öneriler ve İyileştirmeler
- Ziyaretçi Sayacı
- Online Kullanıcı Sayısı
- Duyuru-Haber Modülü
- Resim Galerisi
- Admin Panel
- Kullanıcı Yetkilendirmesi
- CSRF Koruması
- Slugify URL'ler
- Soru-Cevap Sistemi

## Teknolojiler

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT Authentication
- OpenAI API
- Multer
- PDF Parser

### Frontend
- React.js
- Material-UI
- Redux Toolkit
- React Router
- Socket.IO Client
- Axios

## Kurulum

1. Repoyu klonlayın:
```bash
git clone https://github.com/yourusername/cv-ai6.git
cd cv-ai6
```

2. Backend bağımlılıklarını yükleyin:
```bash
npm install
```

3. Frontend bağımlılıklarını yükleyin:
```bash
cd frontend
npm install
```

4. .env dosyasını düzenleyin:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cv-ai-main
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

5. MongoDB'yi başlatın:
```bash
mongod
```

6. Backend'i başlatın:
```bash
npm run dev
```

7. Frontend'i başlatın:
```bash
cd frontend
npm start
```

## API Endpoints

### Kimlik Doğrulama
- POST /api/auth/register - Kullanıcı kaydı
- POST /api/auth/login - Kullanıcı girişi
- GET /api/auth/me - Kullanıcı bilgileri
- POST /api/auth/logout - Çıkış yapma

### Analiz
- POST /api/analysis/company - Firma analizi
- POST /api/analysis/cv - CV analizi
- POST /api/analysis/match - Eşleştirme analizi

### Duyurular
- GET /api/announcements - Tüm duyurular
- GET /api/announcements/:slug - Tek duyuru
- POST /api/announcements - Yeni duyuru (admin)
- PUT /api/announcements/:id - Duyuru güncelleme (admin)
- DELETE /api/announcements/:id - Duyuru silme (admin)

### Galeri
- GET /api/gallery - Tüm resimler
- POST /api/gallery - Resim yükleme (admin)
- DELETE /api/gallery/:filename - Resim silme (admin)

### Soru-Cevap
- POST /api/qa/ask - Soru sorma
- GET /api/qa/history - Soru geçmişi
- GET /api/qa/:id - Soru detayı
- DELETE /api/qa/:id - Soru silme

## Güvenlik

- JWT tabanlı kimlik doğrulama
- CSRF koruması
- Rate limiting
- Helmet güvenlik başlıkları
- Şifre hashleme
- Dosya yükleme güvenliği

## Lisans

MIT 