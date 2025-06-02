// backend/config/gemini.js
require('dotenv').config()

// Google Gen AI SDK'dan import
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ortam değişkeninden anahtarı al
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = genAI;
