// backend/routes/gallery.js
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const mongoose = require('mongoose');
const Gallery = require('../models/Gallery');
const { auth, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Yükleme dizini
const uploadDir = path.join(__dirname, '../uploads/gallery');

// Eğer yükleme dizini yoksa oluştur
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer ayarları (PDF yükleme)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Sadece PDF formatında şablon yükleyebilirsiniz'));
    }
    cb(null, true);
  },
  limits: { fileSize: 1024 * 1024 * 10 }
});

// 1) Yeni şablon yükle (Admin)
router.post('/', auth, isAdmin, upload.single('file'), async (req, res) => {
    try {
      const { title, description = '' } = req.body;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'CV dosyası yüklenmedi.' });
      }
      const filename = req.file.filename;
      const item = await Gallery.create({
        title: title.trim(),
        description,
        filename,
        author: req.user._id
      });
      res.status(201).json({ success: true, item });
    } catch (err) {
      console.error('Şablon yükleme hatası:', err);
      res.status(500).json({ success: false, message: 'Şablon yüklenirken hata oluştu.' });
    }
});

// 2) Tüm şablonları listele (Public) - Arama ve sıralama eklendi
router.get('/', async (req, res) => {
  try {
    const { searchTerm, sortBy = 'createdAtDesc' } = req.query; // Get query parameters

    let filter = {};
    if (searchTerm) {
      // Case-insensitive search on title and description
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    let sort = {};
    switch (sortBy) {
      case 'createdAtAsc':
        sort.createdAt = 1;
        break;
      case 'titleAsc':
        sort.title = 1;
        break;
      case 'titleDesc':
        sort.title = -1;
        break;
      case 'createdAtDesc': // Default
      default:
        sort.createdAt = -1;
        break;
    }

    const items = await Gallery.find(filter).sort(sort);
    res.json({ success: true, items });
  } catch (err) {
    console.error('Şablon listeleme hatası:', err);
    res.status(500).json({ success: false, message: 'Şablonlar listelenirken hata oluştu.' });
  }
});

// 3) Şablon detay (Public) - Slug yerine ID kullan
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Geçersiz şablon ID' });
    }
    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Şablon bulunamadı.' });
    res.json({ success: true, item });
  } catch (err) {
    console.error('Şablon getirme hatası:', err);
    res.status(500).json({ success: false, message: 'Şablon getirilirken hata oluştu.' });
  }
});

// 4) Şablon sil (Admin) - Dosya silme mantığı eklendi
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Geçersiz şablon ID' });
    }
    const itemToDelete = await Gallery.findById(req.params.id);
    if (!itemToDelete) return res.status(404).json({ success: false, message: 'Şablon bulunamadı.' });

    const deleted = await Gallery.findByIdAndDelete(req.params.id);

    if (deleted && itemToDelete.filename) {
        const filePath = path.join(uploadDir, itemToDelete.filename);
        fs.unlink(filePath, (err) => {
            if (err) console.error('Şablon dosyası silme hatası:', err);
            else console.log(`Şablon dosyası ${itemToDelete.filename} silindi.`);
        });
    }

    res.json({ success: true, message: 'Şablon başarıyla silindi.' });
  } catch (err) {
    console.error('Şablon silme hatası:', err);
    res.status(500).json({ success: false, message: 'Şablon silinirken hata oluştu.' });
  }
});

// 5) Şablon güncelle (Admin) - PUT rotası eklendi
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Geçersiz şablon ID' });
    }
    const { title, description } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'Güncellenecek veri sağlanmadı.' });
    }

    const updated = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Şablon bulunamadı.' });
    }

    res.json({ success: true, item: updated });
  } catch (err) {
    console.error('Şablon güncelleme hatası:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Statik dosyaları sunma rotası
router.use('/uploads/gallery', express.static(uploadDir));

module.exports = router;
