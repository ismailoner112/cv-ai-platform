// backend/routes/announcements.js
const express      = require('express');
const Announcement = require('../models/Announcement');
const { auth, isAdmin } = require('../middleware/auth');
const router = express.Router();

// Duyuruları listele (herkes erişebilir)
router.get('/', auth, async (req, res) => {
  try {
    const now = new Date();
    const {
      filter = '',
      category,
      source, // Only filter DB results by source
      keyword, // Added keyword parameter
      page = 1,
      limit = 10,
      all = 'false', // Admin için yayınlanmamışları gösterme
      // Yeni filtre parametreleri
      salary,
      experience,
      education,
      skills
    } = req.query;

    // DB sorgusu
    const query = {};
    // Admin olmayan kullanıcılar için filtreler
    if (req.user?.role !== 'admin') {
      query.isPublished = true;
      query.$and = [
        { $or: [{ publishDate: { $lte: now } }, { publishDate: null }] },
        { $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }] }
      ];
    }
    // Admin ise 'all' parametresi yayınlanmamışları da gösterir
    if (req.user?.role === 'admin' && all !== 'true') {
       query.isPublished = true;
       query.$and = [
        { $or: [{ publishDate: { $lte: now } }, { publishDate: null }] },
        { $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }] }
      ];
    } else if (req.user?.role !== 'admin' && all === 'true') {
        // Normal kullanıcı 'all=true' gönderse bile sadece yayınlanmışları görsün
        query.isPublished = true;
        query.$and = [
         { $or: [{ publishDate: { $lte: now } }, { publishDate: null }] },
         { $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }] }
       ];
    }

    if (filter)   query.title    = { $regex: filter, $options: 'i' };
    if (category) query.category = category;
    // Sadece veritabanında kayıtlı kaynaklara göre filtrele
    if (source && source !== 'jobs,linkedin') {
      query.source = source; // Sadece DB kaynaklarını filtrele (örneğin 'veritabani')
    }
    // Filter by keyword in the keywords array
    if (keyword) {
      // Anahtar kelimeyi büyük/küçük harf duyarsız arama için regex kullan
      query.keywords = { $in: [new RegExp(keyword, 'i')] }; // Use regex for case-insensitive search within the array
    }

    // Yeni filtre koşulları
    if (salary) {
        query.salary = { $regex: salary, $options: 'i' };
    }
    if (experience) {
        query.experience = { $regex: experience, $options: 'i' };
    }
    if (education) {
        query.education = { $regex: education, $options: 'i' };
    }
    // Yetenekler virgülle ayrılmış bir string olarak geliyorsa diziye çevir
    if (skills) {
        const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
        if (skillsArray.length > 0) {
             // Gelen yeteneklerden herhangi biri duyurunun yetenekler listesinde geçiyor mu?
            query.skills = { $in: skillsArray }; // Exact match for each skill in the provided list
             // veya gelen her yetenek duyurunun yetenekler listesinde geçiyor mu? (AND mantığı)
            // query.skills = { $all: skillsArray }; // All skills must be present
        }
    }

    // DB'den çek
    const pageNum  = Math.max(parseInt(page, 10), 1);
    const perPage  = Math.max(parseInt(limit, 10), 1);
    const skipRows = (pageNum - 1) * perPage;

    const [ total, dbAnns ] = await Promise.all([
      Announcement.countDocuments(query),
      Announcement.find(query)
        .sort({ publishDate: -1 })
        .skip(skipRows)
        .limit(perPage)
    ]);

    // Scraping mantığı kaldırıldı. Liste sadece DB sonuçlarını döndürür.
    // Scraped sonuçlar ayrı bir endpointten çekilip DB'ye kaydedilmeli.
    const allAnns = dbAnns; // Sadece DB sonuçları

    // Pagination bilgilerini düzelt
    const totalPages = Math.ceil(total / perPage);

    res.json({
      success: true,
      announcements: allAnns,
      pagination: {
        total: total,
        page: pageNum,
        limit: perPage,
        pages: totalPages
      }
    });

  } catch (err) {
    console.error('Duyuru listeleme hatası:', err);
    res.status(500).json({ success: false, message: 'Duyurular listelenirken hata oluştu.' });
  }
});

// Yeni duyuru oluştur (Admin)
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const announcement = new Announcement(req.body);
    await announcement.save();
    res.status(201).json({ success: true, announcement });
  } catch (err) {
    console.error('Duyuru oluşturma hatası:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Duyuru detayını getir (Herkes erişebilir, admin için tüm detaylar)
router.get('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Duyuru bulunamadı' });
    }
    // Eğer kullanıcı admin değilse sadece yayınlanmış duyuruları göster
    if (req.user?.role !== 'admin' && !announcement.isPublished) {
         return res.status(404).json({ success: false, message: 'Duyuru bulunamadı' });
    }
    res.json({ success: true, announcement });
  } catch (err) {
    console.error('Duyuru detay hatası:', err);
    res.status(500).json({ success: false, message: 'Duyuru getirilirken hata oluştu.' });
  }
});

// Duyuruyu güncelle (Admin)
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Duyuru bulunamadı' });
    }
    res.json({ success: true, announcement });
  } catch (err) {
    console.error('Duyuru güncelleme hatası:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Duyuruyu sil (Admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Duyuru bulunamadı' });
    }
    res.json({ success: true, message: 'Duyuru başarıyla silindi' });
  } catch (err) {
    console.error('Duyuru silme hatası:', err);
    res.status(500).json({ success: false, message: 'Duyuru silinirken hata oluştu.' });
  }
});

module.exports = router;
