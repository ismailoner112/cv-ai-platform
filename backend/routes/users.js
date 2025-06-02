// backend/routes/users.js
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Announcement = require('../models/Announcement');
const { auth, isAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

// --- Kullanıcının favorilerini getir ---
router.get('/favorites', auth, async (req,res) => {
  const user = await User.findById(req.user._id).populate('favorites');
  res.json({ success:true, favorites: user.favorites });
});

// --- Favori ekle ---
// POST /api/users/favorites/:id
// Eğer zaten ekliyse tekrar eklemez
router.post('/favorites/:id', auth, async (req,res) => {
  try {
    const uid = req.user._id;
    const aid = req.params.id;

    // Geçersiz Announcement ID kontrolü
    if (!mongoose.Types.ObjectId.isValid(aid)) {
        return res.status(400).json({ success: false, message: 'Geçersiz duyuru ID' });
    }

    const user = await User.findById(uid);
    if (!user) { // Should not happen with auth middleware, but for safety
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    const aidObjectId = new mongoose.Types.ObjectId(aid); // ObjectId olarak dönüştür
    const isFavorite = user.favorites.some(favId => favId.equals(aidObjectId)); // ObjectId karşılaştırması

    if (!isFavorite) {
        user.favorites.push(aidObjectId); // ObjectId olarak ekle
        await user.save();
    }

    // Güncellenmiş favori listesini populate ederek dön
    const updatedUser = await User.findById(uid).populate('favorites');
    res.json({ success: true, favorites: updatedUser.favorites });

  } catch (err) {
    console.error('Favori ekleme hatası:', err);
    res.status(500).json({ success: false, message: 'Favori eklenirken hata oluştu.' });
  }
});

// --- Favoriden çıkar ---
// DELETE /api/users/favorites/:id
router.delete('/favorites/:id', auth, async (req, res) => {
  try {
    const annId = req.params.id;

    // Geçersiz Announcement ID kontrolü
    if (!mongoose.Types.ObjectId.isValid(annId)) {
        return res.status(400).json({ success: false, message: 'Geçersiz duyuru ID' });
    }

    const user = await User.findById(req.user._id);
     if (!user) { // Should not happen with auth middleware, but for safety
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    // ObjectId karşılaştırması yaparak filtrele
    user.favorites = user.favorites.filter(favId => !favId.equals(new mongoose.Types.ObjectId(annId)));

    await user.save();
    // Güncellenmiş favori listesini populate ederek dön (isteğe bağlı, mesaj da dönebilir)
    const updatedUser = await User.findById(req.user._id).populate('favorites');
    res.json({ success:true, message:'Favoriden çıkarıldı.', favorites: updatedUser.favorites });

  } catch (err) {
    console.error('Favoriden çıkarılırken hata:', err);
    res.status(500).json({ success: false, message: 'Favoriden çıkarılırken hata oluştu.' });
  }
});

// --- Admin Kullanıcı Yönetimi Endpointleri ---

// Yeni kullanıcı oluştur (Admin)
// POST /api/users/
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { name, surname, email, password, role = 'user' } = req.body;

    if (!name || !surname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Ad, Soyad, E-posta ve Şifre zorunlu.' });
    }

    // Admin email ile normal kullanıcı oluşturulamaz (auth rotasında da kontrol var ama tekrar edilebilir)
    if (email === 'adminuser@gmail.com') {
         return res.status(400).json({ success: false, message: 'Bu e-posta adresi ile normal kullanıcı oluşturulamaz.' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'E-posta zaten kullanılıyor.' });
    }

    const user = new User({ name, surname, email, password, role }); // Şifre modelin pre-save hook'u ile hashlenecek
    await user.save();

    // Güvenlik nedeniyle şifreyi döndürme
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ success: true, user: userResponse });

  } catch (err) {
    console.error('Kullanıcı oluşturma hatası:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Tüm kullanıcıları listele (Admin)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('_id email role name surname');
    res.json({ success: true, users });
  } catch (err) {
    console.error('Kullanıcıları listeleme hatası:', err);
    res.status(500).json({ success: false, message: 'Kullanıcılar listelenirken hata oluştu.' });
  }
});

// Kullanıcı detayını getir (Admin)
router.get('/:id', auth, isAdmin, async (req, res) => {
  try {
    // ID'nin geçerli bir MongoDB ObjectId olup olmadığını kontrol et
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Geçersiz kullanıcı ID' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Kullanıcı detay hatası:', err);
    res.status(500).json({ success: false, message: 'Kullanıcı getirilirken hata oluştu.' });
  }
});

// Kullanıcıyı sil (Admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    // ID'nin geçerli bir MongoDB ObjectId olup olmadığını kontrol et
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Geçersiz kullanıcı ID' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    res.json({ success: true, message: 'Kullanıcı başarıyla silindi' });
  } catch (err) {
    console.error('Kullanıcı silme hatası:', err);
    res.status(500).json({ success: false, message: 'Kullanıcı silinirken hata oluştu.' });
  }
});

// Kullanıcıyı güncelle (Admin - sadece belirli alanlara izin ver)
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    // ID'nin geçerli bir MongoDB ObjectId olup olmadığını kontrol et
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Geçersiz kullanıcı ID' });
    }

    const { name, surname, email, role } = req.body; // Sadece bu alanlara izin ver
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (surname !== undefined) updateData.surname = surname.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (role !== undefined) updateData.role = role.trim();

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'Güncellenecek veri sağlanmadı.' });
    }

    // Email güncelleniyorsa, yeni emailin benzersiz olduğunu kontrol et
    if (updateData.email) {
        const existingUser = await User.findOne({ email: updateData.email });
        if (existingUser && existingUser._id.toString() !== req.params.id) {
            return res.status(400).json({ success: false, message: 'Bu e-posta adresi zaten kullanılıyor.' });
        }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    // Güvenlik nedeniyle güncellenmiş kullanıcı bilgisinde şifreyi göndermeyelim
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json({ success: true, user: userResponse });
  } catch (err) {
    console.error('Kullanıcı güncelleme hatası:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
