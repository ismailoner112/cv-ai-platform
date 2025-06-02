// backend/routes/auth.js
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs'); // Import bcrypt

// Admin kimlik bilgileri (backend'de kontrol edilecek)
const ADMIN_EMAIL = 'adminuser@gmail.com';
const ADMIN_PASSWORD = 'adminuser'; // Düz metin şifre (GEÇİCİ VE GÜVENLİ DEĞİLDİR!)
const USER_EMAIL = 'testuser@gmail.com';
const USER_PASSWORD = 'testuser';

// —————————————
// 0) CSRF Token
// GET /api/auth/csrf-token
// —————————————
router.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// —————————————
// 1) Auth doğrulama
// GET /api/auth/verify
// —————————————
router.get('/verify', auth, (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Auth verify error:', err);
    res.status(500).json({ success: false, message: 'Doğrulama hatası.' });
  }
});

// —————————————
// 2) Kullanıcı kaydı
// POST /api/auth/register
// —————————————
router.post('/register', async (req, res) => {
  try {
    // Verify CSRF token is handled by middleware now, removed manual check
    // const csrfToken = req.headers['x-csrf-token'];
    // if (!csrfToken) {
    //   return res.status(403).json({ success: false, message: 'Geçersiz CSRF token' });
    // }

    const { name, surname, email, password } = req.body;
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Tüm alanlar zorunlu.' });
    }
    
    // Admin email ile kayıt olamaz
    if (email === ADMIN_EMAIL) {
        return res.status(400).json({ success: false, message: 'Bu e-posta adresi ile kayıt olunamaz.' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'E-posta zaten kullanılıyor.' });
    }
    
    const user = new User({ name, surname, email, password, role: 'user' }); // Yeni kullanıcıya varsayılan rol ata
    await user.save();
    const token = user.generateAuthToken();
    
    // Send new CSRF token in response
    res.set('X-CSRF-Token', req.csrfToken());
    res.status(201).json({ 
      success: true, 
      token, 
      user: { id: user._id, name, surname, email, role: user.role },
      csrfToken: req.csrfToken() 
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Kayıt hatası.', error: err.message });
  }
});

// —————————————
// 3) Giriş
// POST /api/auth/login
// —————————————
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Received login attempt for email: ${email}, password: ${password}`); // TEMP LOG

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-posta ve şifre gereklidir.' });
    }
    
    // Eğer admin email ile giriş yapılıyorsa
    if (email === ADMIN_EMAIL) {
        // Şifreyi düz metin olarak karşılaştır (GEÇİCİ VE GÜVENLİ DEĞİLDİR!)
        const isMatch = password === ADMIN_PASSWORD;
        
        if (isMatch) {
             // Admin kullanıcıyı bul veya oluştur (ilk giriş olabilir)
            let adminUser = await User.findOne({ email: ADMIN_EMAIL });
            if (!adminUser) {
                 // Admin kullanıcı veritabanında yoksa oluştur (ilk çalıştırma için)
                // Şifre User modelinin pre-save hook'u ile hashlenecek
                adminUser = new User({
                    name: 'Admin',
                    surname: 'User',
                    email: ADMIN_EMAIL,
                    password: 'adminuser', // Düz metin şifre ver, model hashecek
                    role: 'admin'
                });
                await adminUser.save();
            }
             // Admin kullanıcının rolünü tekrar kontrol et (manuel değişikliklere karşı)
            if (adminUser.role !== 'admin') adminUser.role = 'admin';
            adminUser.lastLogin = new Date();
            adminUser.isOnline = true;
            await adminUser.save();
            const token = adminUser.generateAuthToken();
              res.cookie('token', token, {
            httpOnly: true,
            secure: false,       // prod'da HTTPS kullanıyorsanız true yapın
            sameSite: 'Lax',     // cross-site durumları için 'None' veya 'Strict' / 'Lax' ayarlayın
            maxAge: 60 * 60 * 1000  // 1 saat (ms cinsinden)
          });

            return res.json({ 
              success: true, 
              token, 
              user: { id: adminUser._id, name: adminUser.name, surname: adminUser.surname, email: adminUser.email, role: adminUser.role },
            });

        } else {
            return res.status(401).json({ success: false, message: 'Geçersiz admin şifresi.' });
        }
    }

    // Normal kullanıcı girişi
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Geçersiz kimlik bilgileri.' });
    }

    // Kullanıcının rolünü 'user' olarak ayarla eğer ayarlanmamışsa
    if (!user.role) user.role = 'user';
   
    user.lastLogin = new Date();
    user.isOnline = true;
    await user.save();
    const token = user.generateAuthToken();
              res.cookie('token', token, {
            httpOnly: true,
            secure: false,       // prod'da HTTPS kullanıyorsanız true yapın
            sameSite: 'Lax',     // cross-site durumları için 'None' veya 'Strict' / 'Lax' ayarlayın
            maxAge: 60 * 60 * 1000  // 1 saat (ms cinsinden)
          });
    res.json({ 
      success: true, 
      token, 
      user: { id: user._id, name: user.name, surname: user.surname, email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Giriş hatası.', error: err.message });
  }
});

// —————————————
// 4) Token yenileme
// POST /api/auth/refresh
// —————————————
router.post('/refresh', auth, (req, res) => {
  const user = req.user;
  const payload = { userId:user._id, role:user.role };
  const newToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
  
  // Send new CSRF token in response
  res.set('X-CSRF-Token', req.csrfToken());
  res.json({ 
    success: true, 
    token: newToken,
    csrfToken: req.csrfToken() 
  });
});

// —————————————
// 5) Çıkış
// POST /api/auth/logout
// —————————————
router.post('/logout', auth, async (req, res) => {
  try {
    // Kullanıcıyı offline yap
    await User.findByIdAndUpdate(req.user._id, { isOnline: false });
    
    // Cookie'yi temizle
    res.clearCookie('token', {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/'
    });
    
    res.json({ success: true, message: 'Çıkış yapıldı.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Çıkış hatası.' });
  }
});

module.exports = router;
