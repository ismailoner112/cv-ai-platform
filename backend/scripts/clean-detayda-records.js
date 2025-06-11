// Clean "(Detayda)" records from database
require('dotenv').config();
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');

const cleanDetaydaRecords = async () => {
  try {
    console.log('🚀 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB bağlandı');

    // Find records with "(Detayda)" in company or location
    const recordsToUpdate = await Announcement.find({
      $or: [
        { company: { $regex: '\\(Detayda\\)', $options: 'i' } },
        { location: { $regex: '\\(Detayda\\)', $options: 'i' } }
      ]
    });

    console.log(`📊 Temizlenecek kayıt sayısı: ${recordsToUpdate.length}`);

    if (recordsToUpdate.length === 0) {
      console.log('✅ Temizlenecek kayıt bulunamadı');
      process.exit(0);
    }

    // Update records
    let updatedCount = 0;
    for (const record of recordsToUpdate) {
      let updated = false;

      // Clean company field
      if (record.company && record.company.includes('(Detayda)')) {
        record.company = 'Şirket Bilgisi Mevcut Değil';
        updated = true;
      }

      // Clean location field
      if (record.location && record.location.includes('(Detayda)')) {
        record.location = 'Türkiye';
        updated = true;
      }

      if (updated) {
        await record.save();
        updatedCount++;
        console.log(`🔄 Güncellendi: ${record.title} - ${record.company} - ${record.location}`);
      }
    }

    console.log(`✅ Toplam ${updatedCount} kayıt güncellendi`);
    
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  } finally {
    mongoose.disconnect();
    console.log('👋 MongoDB bağlantısı kapatıldı');
  }
};

cleanDetaydaRecords(); 