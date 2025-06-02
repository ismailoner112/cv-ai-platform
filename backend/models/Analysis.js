// backend/models/Analysis.js
const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyUrl: {
    type: String,
    required: false // Hem firma hem CV analizi yapılabilir, URL zorunlu değil
  },
  cvFileName: {
    type: String,
    required: false // Aynı şekilde
  },
  companyAnalysis: {
    type: Object, // veya daha detaylı bir schema
    required: false // Sadece firma analizi yapıldığında dolar
  },
  cvAnalysis: {
    type: Object, // veya daha detaylı bir schema
    required: false // Sadece CV analizi yapıldığında dolar
  },
  matchAnalysis: {
    type: Object, // veya daha detaylı bir schema
    required: false // Sadece eşleştirme yapıldığında dolar
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending' // Analizler zaman alabilir
  },
  error: String,
  // Eski input/result alanları kaldırıldı veya güncellendi
  // Eğer eski verilerle uyumluluk gerekiyorsa, bu alanlar korunabilir
  // ancak yeni yapıya geçiş önerilir.
});

module.exports = mongoose.model('Analysis', analysisSchema);
