const jwt = require('jsonwebtoken');
const User = require('../models/User');
const csrf = require('csurf');

// Ortak hata mesajları
const ERROR_MESSAGES = {
  NO_TOKEN: 'Erişim reddedildi. Token bulunamadı.',
  INVALID_TOKEN: 'Geçersiz token. Lütfen tekrar giriş yapın.',
  USER_NOT_FOUND: 'Kullanıcı bulunamadı.',
  UNAUTHORIZED: 'Bu işlem için yetkiniz yok.',
  INVALID_CSRF: 'Geçersiz CSRF token.'
};

// CSRF middleware
exports.csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
});

// Token doğrulama fonksiyonu
const verifyToken = async (token) => {
  try {
    // JWT token'ı doğrula
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select('-password');
    if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    return user;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }
    throw error;
  }
};

// Auth middleware
exports.auth = async (req, res, next) => {
  try {
    // JWT token'ı çerezden al
    const token = req.cookies.token;
    if (!token) throw new Error(ERROR_MESSAGES.NO_TOKEN);

    // Token'ı doğrula
    const user = await verifyToken(token);
    req.user = user;

    // Token'ı otomatik yenile (30 günden az kaldıysa)
    const decoded = jwt.decode(token);
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;
    
    // Eğer token'ın süresi 7 günden az kaldıysa yenile
    if (timeUntilExpiration < 7 * 24 * 60 * 60 * 1000) {
      const newToken = user.generateAuthToken();
      // Yeni token'ı çerez olarak set et
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 gün
      });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

// Admin kontrolü middleware
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: ERROR_MESSAGES.UNAUTHORIZED });
  }
  next();
};