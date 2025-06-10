// backend/models/Announcement.js
const mongoose = require('mongoose');
const slugify  = require('slugify');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  company: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  url: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Geçerli bir URL giriniz'
    }
  },
  source: {
    type: String,
    required: true,
    enum: ['Kariyer.net', 'LinkedIn', 'Şirket', 'Manuel', 'Diğer'],
    default: 'Diğer'
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  jobType: {
    type: String,
    default: 'iş-ilanı',
    enum: ['iş-ilanı', 'staj', 'freelance', 'part-time', 'full-time', 'contract']
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  
  // Enhanced keyword system
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  searchTerm: {
    type: String,
    trim: true // Hangi arama terimi ile çekildi
  },
  
  // Scraping related fields
  scraped: {
    type: Boolean,
    default: false
  },
  lastScrapedAt: {
    type: Date
  },
  scrapingSource: {
    type: String // Hangi scraper tarafından çekildi
  },
  
  // User interaction fields
  views: {
    type: Number,
    default: 0
  },
  favoriteCount: {
    type: Number,
    default: 0
  },
  applicants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Additional job details
  salaryRange: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'TRY'
    }
  },
  requirements: [String],
  benefits: [String],
  workType: {
    type: String,
    enum: ['remote', 'hybrid', 'onsite', 'flexible'],
    default: 'onsite'
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'],
    default: 'mid'
  },
  
  // Meta fields
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
announcementSchema.index({ keywords: 1 });
announcementSchema.index({ source: 1, publishDate: -1 });
announcementSchema.index({ company: 1, publishDate: -1 });
announcementSchema.index({ location: 1, publishDate: -1 });
announcementSchema.index({ isPublished: 1, publishDate: -1 });
announcementSchema.index({ scraped: 1, lastScrapedAt: -1 });
announcementSchema.index({ searchTerm: 1, publishDate: -1 });

// Text index for full-text search
announcementSchema.index({
  title: 'text',
  description: 'text',
  company: 'text',
  location: 'text',
  keywords: 'text'
}, {
  weights: {
    title: 10,
    keywords: 8,
    company: 5,
    description: 2,
    location: 1
  }
});

// Virtual for formatted publish date
announcementSchema.virtual('formattedDate').get(function() {
  return this.publishDate.toLocaleDateString('tr-TR');
});

// Virtual for short description
announcementSchema.virtual('shortDescription').get(function() {
  return this.description.length > 150 
    ? this.description.substring(0, 150) + '...' 
    : this.description;
});

// Pre-save middleware for slug generation and keyword processing
announcementSchema.pre('save', function(next) {
  try {
    // Auto-generate slug if not provided
    if (!this.slug) {
      const baseSlug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      const timestamp = Date.now().toString().slice(-6);
      this.slug = `${baseSlug}-${timestamp}`;
    }
    
    // Update timestamp
    this.updatedAt = new Date();
    
    // Process keywords - remove duplicates and clean
    if (this.keywords && this.keywords.length > 0) {
      this.keywords = [...new Set(
        this.keywords
          .map(k => k.toLowerCase().trim())
          .filter(k => k.length > 1)
      )];
    }
    
    // Auto-extract keywords from title and description if empty
    if (!this.keywords || this.keywords.length === 0) {
      this.keywords = this.extractKeywords();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to extract keywords from job content
announcementSchema.methods.extractKeywords = function() {
  const text = `${this.title} ${this.description}`.toLowerCase();
  
  const techKeywords = [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'nodejs',
    'python', 'java', 'c#', 'php', 'golang', 'swift', 'kotlin',
    'mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
    'frontend', 'backend', 'fullstack', 'full-stack',
    'mobile', 'ios', 'android', 'react native', 'flutter',
    'devops', 'html', 'css', 'sql', 'api', 'rest'
  ];
  
  const jobTypes = [
    'developer', 'geliştirici', 'programcı', 'yazılımcı',
    'mühendis', 'engineer', 'analyst', 'analist',
    'tasarımcı', 'designer', 'architect', 'mimar',
    'lead', 'senior', 'junior', 'intern', 'stajyer'
  ];
  
  const foundKeywords = [];
  [...techKeywords, ...jobTypes].forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  });
  
  return foundKeywords;
};

// Static method for advanced search
announcementSchema.statics.searchJobs = function(searchOptions = {}) {
  const {
    keyword,
    source,
    location,
    company,
    dateFrom,
    dateTo,
    workType,
    experienceLevel,
    salaryMin,
    salaryMax,
    page = 1,
    limit = 10,
    sortBy = 'publishDate'
  } = searchOptions;

  const filter = { isPublished: true };
  
  // Keyword search
  if (keyword) {
    filter.$or = [
      { $text: { $search: keyword } },
      { keywords: { $in: [new RegExp(keyword, 'i')] } },
      { title: { $regex: keyword, $options: 'i' } },
      { company: { $regex: keyword, $options: 'i' } }
    ];
  }
  
  // Filters
  if (source) filter.source = source;
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (company) filter.company = { $regex: company, $options: 'i' };
  if (workType) filter.workType = workType;
  if (experienceLevel) filter.experienceLevel = experienceLevel;
  
  // Date range
  if (dateFrom || dateTo) {
    filter.publishDate = {};
    if (dateFrom) filter.publishDate.$gte = new Date(dateFrom);
    if (dateTo) filter.publishDate.$lte = new Date(dateTo);
  }
  
  // Salary range
  if (salaryMin || salaryMax) {
    filter['salaryRange.min'] = {};
    if (salaryMin) filter['salaryRange.min'].$gte = salaryMin;
    if (salaryMax) filter['salaryRange.max'] = { $lte: salaryMax };
  }
  
  // Sorting
  const sort = {};
  switch (sortBy) {
    case 'publishDate':
      sort.publishDate = -1;
      break;
    case 'views':
      sort.views = -1;
      break;
    case 'title':
      sort.title = 1;
      break;
    case 'company':
      sort.company = 1;
      break;
    case 'relevance':
      if (keyword) {
        sort.score = { $meta: 'textScore' };
      } else {
        sort.publishDate = -1;
      }
      break;
    default:
      sort.publishDate = -1;
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('-__v')
    .lean();
};

// Method to increment view count
announcementSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Announcement', announcementSchema);
