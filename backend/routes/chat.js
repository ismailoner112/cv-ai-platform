// backend/routes/chat.js
const express = require('express');
const { auth } = require('../middleware/auth');
const genAI = require('../config/gemini');
const router = express.Router();

// model oluşturma - Model adını ortam değişkeninden al veya varsayılanı kullan
const modelName = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash-latest"; // Use environment variable
const model = genAI.getGenerativeModel({ model: modelName });

router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) 
      return res.status(400).json({ message: 'message gerekli.' });

    // Yeni bir chat oturumu başlatıyoruz
    const chatSession = model.startChat({
      // history: [], // Eğer geçmiş mesajları korumak isterseniz, buraya ekleyin
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    // Burada sendMessage'e { text: message } nesnesini içeren bir dizi gönderiyoruz
    // Bu hem iterable beklentisini karşılar hem de API'nin 'text' alanını kullanmasını sağlar
    const result = await chatSession.sendMessage([{ text: message }]); // Mesajı [{ text: ... }] formatında gönderdik
    const response = await result.response;
    const reply = response.text();

    res.json({ reply: reply });

  } catch (err) {
    console.error('Gemini Chat API Error:', err);
    res.status(500).json({
      message: 'Yapay zeka ile sohbet sırasında bir hata oluştu.',
      error: err.message
    });
  }
});

module.exports = router;
