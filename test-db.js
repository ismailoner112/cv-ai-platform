const mongoose = require('mongoose');

// Backend modelini kullan
const Announcement = require('./backend/models/Announcement');

async function testDatabase() {
  try {
    console.log('🔍 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect('mongodb://localhost:27017/cv-ai');
    
    console.log('✅ MongoDB bağlantısı başarılı');
    
    // Toplam ilan sayısı
    const totalJobs = await Announcement.countDocuments();
    console.log(`📊 Toplam ilan sayısı: ${totalJobs}`);
    
    // Yayınlanan ilan sayısı
    const publishedJobs = await Announcement.countDocuments({ isPublished: true });
    console.log(`📊 Yayınlanan ilan sayısı: ${publishedJobs}`);
    
    // Son 5 ilan
    const recentJobs = await Announcement.find()
      .select('title company source keywords createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('\n📋 Son 5 ilan:');
    recentJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title} - ${job.company}`);
      console.log(`   Kaynak: ${job.source || 'Belirtilmemiş'}`);
      console.log(`   Keywords: ${job.keywords?.length || 0} adet`);
      console.log(`   Tarih: ${job.createdAt}`);
      console.log('---');
    });
    
    // Keyword istatistikleri
    const keywordStats = await Announcement.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$keywords' },
      { $group: { _id: '$keywords', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('\n🔤 En popüler 10 anahtar kelime:');
    keywordStats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat._id}: ${stat.count} ilan`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB bağlantısı kapatıldı');
  }
}

testDatabase(); 