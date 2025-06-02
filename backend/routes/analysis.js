// filepath: [analysis.js](http://_vscodecontentref_/1)
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const cheerio = require('cheerio'); // HTML parse etmek için eklendi
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper fonksiyon: Metinden Gemini API key ile generative model oluştur
const getGeminiModel = async (userId) => {
  const user = await User.findById(userId);
  const apiKey = user?.geminiApiKey || process.env.GEMINI_API_KEY; // Kullanıcı keyi yoksa ortam değişkenini kullan

  if (!apiKey) {
    throw new Error('Gemini API Key bulunamadı. Lütfen profilinize ekleyin veya ortam değişkenini ayarlayın.');
  }

  // Model adını ortam değişkeninden al veya varsayılanı kullan
  const modelName = process.env.GEMINI_MODEL_NAME || "gemini-pro";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

// Helper fonksiyon: URL içeriğini çekme ve temizleme
const fetchUrlContent = async (url) => {
  try {
    const { data: html } = await axios.get(url, { timeout: 15000 }); // 15 saniye timeout
    const $ = cheerio.load(html);

    // Script ve style taglerini kaldır
    $('script, style').remove();

    // Sadece body içindeki metni al
    const textContent = $('body').text();

    // Birden fazla boşluğu tek boşluğa indirge
    const cleanedText = textContent.replace(/\s+/g, ' ').trim();

    // Çok uzun metinleri kırp (Gemini token limiti için)
    const MAX_TEXT_LENGTH = 10000; // Örnek limit, ihtiyaca göre ayarlanabilir
    return cleanedText.substring(0, MAX_TEXT_LENGTH);

  } catch (error) {
    console.error('URL içeriği çekme hatası:', error.message);
    throw new Error('Firma web sitesi içeriği çekilemedi veya işlenemedi.');
  }
};

// Helper fonksiyon: PDF içeriğini metne dönüştürme
const extractPdfText = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    // Metin üzerinde basit temizlik
    const cleanedText = data.text.replace(/\s+/g, ' ').trim();
    return cleanedText;
  } catch (error) {
    console.error('PDF parse hatası:', error.message);
    throw new Error('CV dosyasından metin çıkarılamadı.');
  }
};

/**
 * @route   POST /api/analysis
 * @desc    CV ve Firma analizi ve eşleştirme başlat
 * @access  Private
 * Body: {
 *   companyUrl: string,
 *   cvFile: file (multipart/form-data)
 * }
 */
router.post('/', auth, upload.single('cvFile'), async (req, res) => {
  const userId = req.user._id;
  const { companyUrl } = req.body;
  const cvFile = req.file;

  if (!companyUrl && !cvFile) {
    return res.status(400).json({ message: 'Analiz yapmak için firma URL\'si veya CV dosyası sağlamalısınız.' });
  }

  // Analiz isteğini veritabanına 'pending' olarak kaydet
  const newAnalysis = new Analysis({
    user: userId,
    companyUrl: companyUrl || null,
    cvFileName: cvFile ? cvFile.originalname : null,
    status: 'pending',
    createdAt: new Date()
  });
  await newAnalysis.save();

  // Frontend'e hemen 'pending' durumuyla yanıt dön
  res.status(202).json({ 
    success: true, 
    message: 'Analiz işlemi başlatıldı.', 
    analysisId: newAnalysis._id, 
    status: 'pending'
  });

  // Analiz işlemini arka planda asenkron olarak yap
  try {
    const model = await getGeminiModel(userId);

    let companyAnalysisResult = null;
    let cvAnalysisResult = null;
    let matchAnalysisResult = null;
    let analysisError = null; // Analiz sırasında oluşan hataları kaydetmek için

    // 1) Firma Analizi
    if (companyUrl) {
      try {
        new URL(companyUrl);
        const htmlContent = await fetchUrlContent(companyUrl);
        const companyPrompt = `You are an expert in analyzing company websites. Analyze the following website content and extract the following information: service area(s), types of projects undertaken, key technologies used (programming languages, frameworks, tools, platforms), and contact information (email, phone, address if available). Provide the output as a JSON object with keys: serviceArea, projects, technologies, contactInfo. Ensure the response is valid JSON and only the JSON object.\n\nWebsite Content:\n${htmlContent}`;

        const result = await model.generateContent(companyPrompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)```/);
        
        if (jsonMatch && jsonMatch[1]) {
          try {
            companyAnalysisResult = JSON.parse(jsonMatch[1]);
          } catch (parseErr) {
            console.error('Firma analizi JSON parse hatası:', parseErr);
            companyAnalysisResult = { error: 'API yanıtı işlenemedi.', raw: responseText };
            analysisError = 'Firma analizi yanıtı işlenemedi.';
          }
        } else {
             console.error('Firma analizi yanıtında JSON bulunamadı:', responseText);
             companyAnalysisResult = { error: 'API yanıtı beklenen formatta değil.', raw: responseText };
             analysisError = 'Firma analizi yanıtı beklenen formatta değil.';
        }

      } catch (err) {
        console.error('Backend Firma analizi hatası:', err.message);
        companyAnalysisResult = { error: err.message };
        analysisError = `Firma analizi hatası: ${err.message}`; // Genel hata mesajına ekle
      }
    }

    // 2) CV Analizi
    if (cvFile) {
      try {
        const pdfText = await extractPdfText(cvFile.buffer);
        const cvPrompt = `You are an expert in analyzing CVs. Analyze the following CV text and extract key information including a summary of skills, work experience, and education. Provide the output as a JSON object with keys: summary, skills (array of strings), experience (array of objects with title, company, duration, description), education (array of objects with degree, institution, duration). Ensure the response is valid JSON and only the JSON object.\n\nCV Text:\n${pdfText}`;

        const result = await model.generateContent(cvPrompt);
        const responseText = result.response.text();
         const jsonMatch = responseText.match(/```json\n([\s\S]*?)```/);

        if (jsonMatch && jsonMatch[1]) {
          try {
             cvAnalysisResult = JSON.parse(jsonMatch[1]);
          } catch (parseErr) {
             console.error('CV analizi JSON parse hatası:', parseErr);
             cvAnalysisResult = { error: 'API yanıtı işlenemedi.', raw: responseText };
             analysisError = 'CV analizi yanıtı işlenemedi.';
          }
        } else {
             console.error('CV analizi yanıtında JSON bulunamadı:', responseText);
             cvAnalysisResult = { error: 'API yanıtı beklenen formatta değil.', raw: responseText };
             analysisError = 'CV analizi yanıtı beklenen formatta değil.';
        }

      } catch (err) {
        console.error('Backend CV analizi hatası:', err.message);
        cvAnalysisResult = { error: err.message };
        analysisError = analysisError ? `${analysisError}, CV analizi hatası: ${err.message}` : `CV analizi hatası: ${err.message}`; // Önceki hata varsa ekle
      }
    }

    // 3) Eşleştirme Analizi (Hem firma hem CV varsa ve ikisinde de kritik API hatası yoksa)
    const canMatch = companyAnalysisResult && cvAnalysisResult && !companyAnalysisResult.error && !cvAnalysisResult.error;

    if (canMatch) {
       try {
          const matchPrompt = `You are an expert in matching CVs to company profiles. Compare the following Company Analysis and CV Analysis results. Determine the probability of the candidate being hired by the company (on a scale of 0 to 100). Provide specific suggestions on how the candidate can improve their CV or skills to better match the company's needs, based on the company's service area, projects, and technologies. Provide the output as a JSON object with keys: probability (number), suggestions (string). Ensure the response is valid JSON and only the JSON object.\n\nCompany Analysis: ${JSON.stringify(companyAnalysisResult)}\nCV Analysis: ${JSON.stringify(cvAnalysisResult)}`;

           const result = await model.generateContent(matchPrompt);
           const responseText = result.response.text();
            const jsonMatch = responseText.match(/```json\n([\s\S]*?)```/);

           if (jsonMatch && jsonMatch[1]) {
             try {
                matchAnalysisResult = JSON.parse(jsonMatch[1]);
             } catch (parseErr) {
                console.error('Eşleştirme analizi JSON parse hatası:', parseErr);
                matchAnalysisResult = { error: 'API yanıtı işlenemedi.', raw: responseText };
                analysisError = analysisError ? `${analysisError}, Eşleştirme analizi yanıtı işlenemedi.` : 'Eşleştirme analizi yanıtı işlenemedi.';
             }
           } else {
                console.error('Eşleştirme analizi yanıtında JSON bulunamadı:', responseText);
                matchAnalysisResult = { error: 'API yanıtı beklenen formatta değil.', raw: responseText };
                 analysisError = analysisError ? `${analysisError}, Eşleştirme analizi yanıtı beklenen formatta değil.` : 'Eşleştirme analizi yanıtı beklenen formatta değil.';
           }

       } catch (err) {
           console.error('Backend Eşleştirme analizi hatası:', err.message);
           matchAnalysisResult = { error: err.message };
            analysisError = analysisError ? `${analysisError}, Eşleştirme analizi hatası: ${err.message}` : `Eşleştirme analizi hatası: ${err.message}`; // Önceki hata varsa ekle
       }
    }

    // Analiz tamamlandı veya hata oluştu, veritabanını güncelle
    await Analysis.findByIdAndUpdate(newAnalysis._id, {
        status: analysisError ? 'failed' : 'completed',
        companyAnalysisResult: companyAnalysisResult || null,
        cvAnalysisResult: cvAnalysisResult || null,
        matchAnalysisResult: matchAnalysisResult || null,
        error: analysisError || null, // Genel hata mesajını kaydet
        completedAt: new Date() // Tamamlanma zamanını ayarla
    });
    console.log(`Analiz ${newAnalysis._id} tamamlandı.`);

  } catch (err) {
      // API Key alınamaması gibi kritik hatalar
      console.error('Genel analiz hatası:', err.message);
      await Analysis.findByIdAndUpdate(newAnalysis._id, {
          status: 'failed',
          error: `Analiz başlatma hatası: ${err.message}`,
          completedAt: new Date()
      });
      console.log(`Analiz ${newAnalysis._id} hata ile sonuçlandı.`);
  }
});

/**
 * @route   GET /api/analysis/:id
 * @desc    Belirli bir analizin sonucunu getir
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const analysisId = req.params.id;

    // ID'nin geçerli bir MongoDB ObjectId olup olmadığını kontrol et
    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
        return res.status(400).json({ success: false, message: 'Geçersiz analiz ID' });
    }

    const analysis = await Analysis.findOne({ _id: analysisId, user: req.user._id });

    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analiz bulunamadı veya erişim izniniz yok.' });
    }

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('Analiz getirme hatası:', err);
    res.status(500).json({ success: false, message: 'Analiz getirilirken bir hata oluştu.' });
  }
});

/**
 * @route   GET /api/analysis
 * @desc    Kullanıcının tüm analizlerini listele
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.user._id }).sort({ createdAt: -1 }); // En son oluşturulanlar önce gelsin
    res.json({ success: true, analyses });
  } catch (err) {
    console.error('Analiz listeleme hatası:', err);
    res.status(500).json({ success: false, message: 'Analizler listelenirken bir hata oluştu.' });
  }
});

module.exports = router;