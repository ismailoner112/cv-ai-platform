// backend/models/Announcement.js
const mongoose = require('mongoose');
const slugify  = require('slugify');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Başlık zorunludur'],
    trim: true,
    maxlength: [200, 'Başlık en fazla 200 karakter olabilir']
  },
  company: {
    type: String,
    required: [true, 'Şirket adı zorunludur'],
    trim: true,
    maxlength: [100, 'Şirket adı en fazla 100 karakter olabilir']
  },
  location: {
    type: String,
    required: false,
    trim: true,
    maxlength: [100, 'Konum en fazla 100 karakter olabilir']
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  url: {
    type: String,
    required: [true, 'URL zorunludur'],
    trim: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
      },
      message: 'Geçerli bir URL giriniz'
    }
  },
  source: {
    type: String,
    required: [true, 'Kaynak zorunludur'],
    enum: {
      values: ['kariyernet', 'linkedin'],
      message: 'Kaynak "kariyernet" veya "linkedin" olmalıdır'
    }
  },
  jobType: {
    type: String,
    required: [true, 'İlan tipi zorunludur'],
    enum: {
      values: ['iş-ilanı', 'staj'],
      message: 'İlan tipi "iş-ilanı" veya "staj" olmalıdır'
    },
    default: 'iş-ilanı'
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: String,
    trim: true
  },
  experience: {
    type: String,
    trim: true
  },
  education: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  benefits: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// İndeksler
announcementSchema.index({ title: 'text', company: 'text', description: 'text' });
announcementSchema.index({ source: 1, jobType: 1 });
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ url: 1 }, { unique: true });
announcementSchema.index({ title: 1, company: 1 });
announcementSchema.index({ source: 1, publishDate: -1 });
announcementSchema.index({ jobType: 1 });
announcementSchema.index({ skills: 1 });
announcementSchema.index({ location: 1 });

// Sanal alanlar
announcementSchema.virtual('favoriteCount').get(function() {
  return this.favorites.length;
});

// Middleware
announcementSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isModified('company')) {
    this.slug = slugify(`${this.company}-${this.title}`, {
      lower: true, strict: true, locale: 'tr'
    });
  }
  // URL'yi normalize et
  if (this.url && !this.url.startsWith('http')) {
    this.url = 'https://' + this.url;
  }
  next();
});

// Statik metodlar
announcementSchema.statics.findBySource = function(source) {
  return this.find({ source, isPublished: true })
    .sort({ publishDate: -1 });
};

announcementSchema.statics.findByType = function(jobType) {
  return this.find({ jobType, isPublished: true })
    .sort({ publishDate: -1 });
};

// Instance metodlar
announcementSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

announcementSchema.methods.toggleFavorite = async function(userId) {
  const index = this.favorites.indexOf(userId);
  
  if (index === -1) {
    this.favorites.push(userId);
  } else {
    this.favorites.splice(index, 1);
  }
  
  return this.save();
};

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
