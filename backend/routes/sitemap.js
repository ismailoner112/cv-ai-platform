const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery'); // Gallery modelini import et
const Announcement = require('../models/Announcement'); // Announcement modelini import et

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'; // Backend URL'si (muhtemelen gerek yok)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // Frontend URL'si

router.get('/sitemap.xml', async (req, res) => {
  res.set('Content-Type', 'application/xml');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Statik rotalar
  const staticRoutes = ['/', '/auth', '/admin/auth', '/gallery', '/announcements'];

  staticRoutes.forEach(route => {
    xml += '<url>\n';
    xml += `  <loc>${FRONTEND_URL}${route}</loc>\n`;
    xml += '</url>\n';
  });

  try {
    // Dinamik rotalar (Gallery) - published filtresi kaldırıldı, ID kullanılacak
    const galleryItems = await Gallery.find({}, '_id'); // Tüm şablonları al, sadece ID
    galleryItems.forEach(item => {
      xml += '<url>\n';
      xml += `  <loc>${FRONTEND_URL}/gallery/${item._id}</loc>\n`; // slug yerine ID kullan
      xml += '</url>\n';
    });

    // Dinamik rotalar (Announcements - sadece yayınlanmış olanlar)
    const announcements = await Announcement.find({ isPublished: true }, '_id'); // Sadece id alanını çek, yayınlanmış olanlar
     announcements.forEach(ann => {
      xml += '<url>\n';
      xml += `  <loc>${FRONTEND_URL}/announcements/${ann._id}</loc>\n`;
      xml += '</url>\n';
    });

  } catch (error) {
    console.error('Sitemap oluşturma hatası:', error);
    // Hata durumunda bile en azından statik rotaları göstermek iyi olabilir
  }

  xml += '</urlset>';

  res.send(xml);
});

module.exports = router; 