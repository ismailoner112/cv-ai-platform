// backend/middleware/visitor.js
const Visitor = require('../models/Visitor');
const { v4: uuidv4 } = require('uuid');

module.exports = async function visitorTracker(req, res, next) {
  try {
    // 1) sessionId cookie’si kontrol / oluşturma
    let sessionId = req.cookies.sessionId;
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000  // 1 hafta
      });
    }

    // 2) İstek bilgileri
    const ip        = req.ip;
    const userAgent = req.get('User-Agent') || 'unknown';
    const page      = req.originalUrl;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 3) Son 1 saatte aynı session+page kaydı var mı?
    const existing = await Visitor.findOne({
      sessionId,
      page,
      timestamp: { $gte: oneHourAgo }
    });

    // 4) Yeni kaydı ekle
    await Visitor.create({
      sessionId,
      ip,
      userAgent,
      page,
      isUnique: !existing
    });
  } catch (err) {
    console.error('Visitor tracking error:', err);
    // hata olsa da devam et
  }
  next();
};
