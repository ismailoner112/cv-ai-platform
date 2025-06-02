// backend/models/Gallery.js
const mongoose = require('mongoose');
const slugify  = require('slugify');

const gallerySchema = new mongoose.Schema({
  title: {
    type: String, trim: true, required: true
  },
  description: {
    type: String, default: ''
  },
  slug: {
    type: String, unique: true
  },
  filename: {
    type: String, required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User'
  },
  createdAt: {
    type: Date, default: Date.now
  }
}, {
  timestamps: true
});

// Başlıktan URL‑friendly slug üret
gallerySchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true, locale: 'tr' });
  }
  next();
});

module.exports = mongoose.model('Gallery', gallerySchema);
