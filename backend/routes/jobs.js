const express = require('express');
const router = express.Router();
const { scrapeJobs, testScrapeKariyer, testScrapeLinkedIn, testFullScrape, getScrapeInfo } = require('../scrape/scraper');
const Announcement = require('../models/Announcement');
const { auth, isAdmin } = require('../middleware/auth');

// Test endpoint to check if scraping works
router.get('/test', auth, isAdmin, async (req, res) => {
  try {
    console.log('Test endpoint hit - checking scraper functionality');
    
    // Simple test to see if we can reach external sites
    const axios = require('axios');
    const testUrl = 'https://httpbin.org/user-agent';
    
    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    res.json({
      success: true,
      message: 'Network test successful',
      data: response.data
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Network test failed',
      error: error.message
    });
  }
});

// Enhanced main scraping endpoint (Admin only)
router.post('/scrape', auth, isAdmin, async (req, res) => {
  console.log('🚀 Manual scraping başlatıldı');
  
  try {
    const { searchTerm = 'yazılım mühendisi', limit = 10 } = req.body;
    
    console.log(`📋 Scraping parametreleri: "${searchTerm}", limit: ${limit}`);
    
    // Ana scraping fonksiyonunu çağır
    const result = await scrapeJobs(searchTerm, parseInt(limit));
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        jobs: result.jobs,
        sources: result.sources,
        total: result.total,
        database: result.database,
        keyword: result.keyword,
        scrapedAt: result.scrapedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Manual scraping error:', error);
    res.status(500).json({
      success: false,
      message: 'Scraping işlemi başarısız',
      error: error.message
    });
  }
});

// Debug endpoints (Admin only)
router.get('/test-kariyer', auth, isAdmin, async (req, res) => {
  console.log('🧪 Kariyer.net test başlatıldı');
  
  try {
    const result = await testScrapeKariyer();
    res.json(result);
  } catch (error) {
    console.error('❌ Kariyer.net test error:', error);
    res.status(500).json({
      success: false,
      message: 'Kariyer.net test başarısız',
      error: error.message
    });
  }
});

router.get('/test-linkedin', auth, isAdmin, async (req, res) => {
  console.log('🧪 LinkedIn test başlatıldı');
  
  try {
    const result = await testScrapeLinkedIn();
    res.json(result);
  } catch (error) {
    console.error('❌ LinkedIn test error:', error);
    res.status(500).json({
      success: false,
      message: 'LinkedIn test başarısız',
      error: error.message
    });
  }
});

router.get('/test-full', auth, isAdmin, async (req, res) => {
  console.log('🧪 Full scrape test başlatıldı');
  
  try {
    const result = await testFullScrape();
    res.json(result);
  } catch (error) {
    console.error('❌ Full scrape test error:', error);
    res.status(500).json({
      success: false,
      message: 'Full scrape test başarısız',
      error: error.message
    });
  }
});

router.get('/quick-scrape/:term', auth, isAdmin, async (req, res) => {
  console.log('⚡ Quick scrape başlatıldı');
  
  try {
    const { term } = req.params;
    const result = await scrapeJobs(term, 5);
    res.json(result);
  } catch (error) {
    console.error('❌ Quick scrape error:', error);
    res.status(500).json({
      success: false,
      message: 'Quick scrape başarısız',
      error: error.message
    });
  }
});

router.get('/scraper-info', auth, isAdmin, async (req, res) => {
  try {
    const info = getScrapeInfo();
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('❌ Scraper info error:', error);
    res.status(500).json({
      success: false,
      message: 'Scraper bilgileri alınamadı',
      error: error.message
    });
  }
});

// PUBLIC USER ENDPOINTS - No authentication required

// Kullanıcılar için: Anahtar kelime bazında iş ilanlarını getir
router.get('/search', async (req, res) => {
  try {
    console.log('🔍 /search endpoint called with query:', req.query);
    
    // Quick DB check
    const totalAnnouncements = await Announcement.countDocuments();
    const publishedAnnouncements = await Announcement.countDocuments({ isPublished: true });
    console.log(`📊 Quick DB check: Total: ${totalAnnouncements}, Published: ${publishedAnnouncements}`);
    
    const { 
      keyword, 
      page = 1, 
      limit = 10, 
      source,
      location,
      company,
      sortBy = 'publishDate'
    } = req.query;

    const filter = { isPublished: true };
    const sort = {};

    // Anahtar kelime araması
    if (keyword) {
      filter.$or = [
        { searchTerm: { $regex: keyword, $options: 'i' } },
        { keywords: { $in: [new RegExp(keyword, 'i')] } },
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { company: { $regex: keyword, $options: 'i' } }
      ];
    }

    // Filtreler
    if (source) filter.source = source;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (company) filter.company = { $regex: company, $options: 'i' };

    // Sıralama
    switch (sortBy) {
      case 'publishDate':
        sort.publishDate = -1;
        break;
      case 'title':
        sort.title = 1;
        break;
      case 'company':
        sort.company = 1;
        break;
      case 'views':
        sort.views = -1;
        break;
      default:
        sort.publishDate = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log('📊 Filter used:', filter);
    console.log('📊 Sort used:', sort);

    const jobs = await Announcement.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('title company location description url source publishDate keywords views favoriteCount');

    const total = await Announcement.countDocuments(filter);

    console.log(`✅ Found ${jobs.length} jobs out of ${total} total`);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        keyword: keyword || null,
        source: source || null,
        location: location || null,
        company: company || null,
        sortBy
      }
    });

  } catch (error) {
    console.error('İş ilanları arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İş ilanları aranamadı',
      error: error.message
    });
  }
});

// Kullanıcılar için: Scraping gruplarını getir (searchTerm bazında)
router.get('/scraping-groups', async (req, res) => {
  try {
    console.log('🔍 /scraping-groups endpoint called');
    
    // First check total announcements
    const totalAnnouncements = await Announcement.countDocuments();
    const publishedAnnouncements = await Announcement.countDocuments({ isPublished: true });
    const scrapedAnnouncements = await Announcement.countDocuments({ scraped: true });
    const withSearchTerm = await Announcement.countDocuments({ 
      searchTerm: { $exists: true, $ne: null, $ne: '' } 
    });
    
    console.log(`📊 DB Stats: Total: ${totalAnnouncements}, Published: ${publishedAnnouncements}, Scraped: ${scrapedAnnouncements}, WithSearchTerm: ${withSearchTerm}`);
    
    const scrapingGroups = await Announcement.aggregate([
      { 
        $match: { 
          isPublished: true, 
          scraped: true,
          searchTerm: { $exists: true, $ne: null, $ne: '' }
        } 
      },
      { 
        $group: { 
          _id: '$searchTerm', 
          count: { $sum: 1 },
          lastScraped: { $max: '$lastScrapedAt' },
          latestJob: { $max: '$publishDate' },
          sources: { $addToSet: '$source' }
        }
      },
      { $sort: { lastScraped: -1, count: -1 } }
    ]);

    console.log(`✅ Found ${scrapingGroups.length} scraping groups`);

    res.json({
      success: true,
      data: scrapingGroups.map(item => ({
        searchTerm: item._id,
        title: item._id,
        count: item.count,
        lastScraped: item.lastScraped,
        latestJob: item.latestJob,
        sources: item.sources
      }))
    });

  } catch (error) {
    console.error('Scraping grupları hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Scraping grupları alınamadı',
      error: error.message
    });
  }
});

// Kullanıcılar için: Popüler anahtar kelimeleri getir
router.get('/keywords', async (req, res) => {
  try {
    const keywordStats = await Announcement.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$keywords' },
      { $group: { 
        _id: '$keywords', 
        count: { $sum: 1 },
        lastUsed: { $max: '$publishDate' }
      }},
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    const trendingKeywords = await Announcement.aggregate([
      { $match: { 
        isPublished: true,
        publishDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Son 7 gün
      }},
      { $unwind: '$keywords' },
      { $group: { 
        _id: '$keywords', 
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: {
        popular: keywordStats.map(item => ({
          keyword: item._id,
          count: item.count,
          lastUsed: item.lastUsed
        })),
        trending: trendingKeywords.map(item => ({
          keyword: item._id,
          count: item.count
        }))
      }
    });

  } catch (error) {
    console.error('Anahtar kelime istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Anahtar kelime istatistikleri alınamadı',
      error: error.message
    });
  }
});

// Kullanıcılar için: İlan kategorilerini getir (source bazında)
router.get('/categories', async (req, res) => {
  try {
    const sourceStats = await Announcement.aggregate([
      { $match: { isPublished: true } },
      { $group: { 
        _id: '$source', 
        count: { $sum: 1 },
        latestJob: { $max: '$publishDate' }
      }},
      { $sort: { count: -1 } }
    ]);

    const locationStats = await Announcement.aggregate([
      { $match: { isPublished: true, location: { $exists: true, $ne: '' } } },
      { $group: { 
        _id: '$location', 
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const companyStats = await Announcement.aggregate([
      { $match: { isPublished: true } },
      { $group: { 
        _id: '$company', 
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        sources: sourceStats.map(item => ({
          source: item._id,
          count: item.count,
          latestJob: item.latestJob
        })),
        locations: locationStats.map(item => ({
          location: item._id,
          count: item.count
        })),
        companies: companyStats.map(item => ({
          company: item._id,
          count: item.count
        }))
      }
    });

  } catch (error) {
    console.error('Kategori istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori istatistikleri alınamadı',
      error: error.message
    });
  }
});

// Kullanıcılar için: Son eklenen ilanları getir
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const recentJobs = await Announcement.find({ isPublished: true })
      .sort({ publishDate: -1 })
      .limit(parseInt(limit))
      .select('title company location description url source publishDate keywords views')
      .populate('favorites', 'length');

    res.json({
      success: true,
      data: recentJobs,
      total: recentJobs.length
    });

  } catch (error) {
    console.error('Son ilanları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Son ilanlar getirilemedi',
      error: error.message
    });
  }
});

// Kullanıcılar için: İstatistikler
router.get('/stats', async (req, res) => {
  try {
    const totalJobs = await Announcement.countDocuments({ isPublished: true });
    const totalCompanies = await Announcement.distinct('company', { isPublished: true });
    const totalSources = await Announcement.distinct('source', { isPublished: true });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayJobs = await Announcement.countDocuments({ 
      isPublished: true,
      publishDate: { $gte: today }
    });

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyJobs = await Announcement.countDocuments({ 
      isPublished: true,
      publishDate: { $gte: lastWeek }
    });

    res.json({
      success: true,
      data: {
        totalJobs,
        totalCompanies: totalCompanies.length,
        totalSources: totalSources.length,
        todayJobs,
        weeklyJobs,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('İstatistik hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı',
      error: error.message
    });
  }
});

// İş ilanlarını listele
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const jobs = await Announcement.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Announcement.countDocuments();

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('İş ilanları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İş ilanları getirilemedi',
      error: error.message
    });
  }
});

// Tek iş ilanı getir
router.get('/:id', async (req, res) => {
  try {
    const job = await Announcement.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş ilanı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('İş ilanı getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İş ilanı getirilemedi',
      error: error.message
    });
  }
});

// İş ilanı sil (Admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const job = await Announcement.findByIdAndDelete(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş ilanı bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'İş ilanı silindi'
    });
  } catch (error) {
    console.error('İş ilanı silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İş ilanı silinemedi',
      error: error.message
    });
  }
});

module.exports = router; 