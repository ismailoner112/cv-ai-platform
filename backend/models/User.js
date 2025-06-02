// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  surname: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Geçerli bir e-posta adresi girin.']
  },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },
  lastLogin: { type: Date, default: null },

  // Gemini API Key alanı eklendi
  geminiApiKey: {
    type: String,
    required: false, // Kullanıcılar API key girmek zorunda değil
    trim: true
  },

  // 👇 Favori duyurular için:
  favorites: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Announcement'
}]
}, { timestamps: true })
// Parola hash'leme
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Parola kontrol metodu
userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

// JWT oluşturma metodu
userSchema.methods.generateAuthToken = function() {
  const payload = { userId: this._id, role: this.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
};

module.exports = mongoose.model('User', userSchema);
