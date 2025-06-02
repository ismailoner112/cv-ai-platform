const cron = require('node-cron');
const { scrapeAll } = require('../scrape/scraper');
const Announcement = require('../models/Announcement');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB bağlı'))
.catch(err => {
  console.error('❌ MongoDB bağlantı hatası:', err);
  process.exit(1);
});

// Scraping işlemini gerçekleştir
const runScraping = async () => {
  console.log('🔄 Scraping başlatılıyor...');
  const startTime = Date.now();

  try {
    // Tüm kaynaklardan ilanları çek
    const results = await scrapeAll('', {
      useProxy: process.env.USE_PROXY === 'true',
      retryCount: 3
    });

    // Hataları kontrol et
    if (results.errors.length > 0) {
      console.error('⚠️ Scraping hataları:', results.errors);
    }

    // İlanları veritabanına kaydet
    const savedJobs = [];
    const errors = [];

    for (const [source, jobs] of Object.entries(results)) {
      if (source === 'errors') continue;

      console.log(`📥 ${source} için ${jobs.length} ilan işleniyor...`);

      for (const job of jobs) {
        try {
          // Aynı URL'ye sahip ilan var mı kontrol et
          const existingJob = await Announcement.findOne({ url: job.url });
          
          if (!existingJob) {
            const announcement = new Announcement({
              title: job.title,
              company: job.company,
              location: job.location,
              description: job.description,
              url: job.url,
              source: job.source,
              postedAt: job.postedAt,
              jobType: 'iş-ilanı'
            });

            await announcement.save();
            savedJobs.push(announcement);
          }
        } catch (saveError) {
          errors.push({
            job: job.title,
            error: saveError.message
          });
        }
      }
    }

    // İstatistikleri hesapla
    const duration = (Date.now() - startTime) / 1000;
    console.log(`
✅ Scraping tamamlandı:
   - Süre: ${duration.toFixed(2)} saniye
   - Yeni ilan: ${savedJobs.length}
   - Hata: ${errors.length}
   - Scraping hataları: ${results.errors.length}
    `);

    // Hataları logla
    if (errors.length > 0) {
      console.error('❌ Kaydetme hataları:', errors);
    }

  } catch (error) {
    console.error('❌ Scraping hatası:', error);
  }
};

// Her gün gece yarısı çalıştır
cron.schedule('0 0 * * *', () => {
  console.log('🕐 Günlük scraping zamanı geldi');
  runScraping();
});

// Manuel çalıştırma için
if (require.main === module) {
  console.log('🚀 Manuel scraping başlatılıyor...');
  runScraping();
}

module.exports = runScraping; 