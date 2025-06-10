const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const { scrapeJobs, testScrape, testJobSite } = require('../scrape/scraper'); // Import test functions
const Announcement = require('../models/Announcement'); // Import Announcement model

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

// Advanced scraping test endpoint
router.get('/test-scrape', auth, isAdmin, async (req, res) => {
  try {
    console.log('Testing scraper components...');
    
    const basicTest = await testScrape();
    const kariyerTest = await testJobSite('kariyernet');
    const linkedinTest = await testJobSite('linkedin');
    
    res.json({
      success: true,
      message: 'Scraping component tests completed',
      data: {
        basicScraping: basicTest,
        kariyernetConnection: kariyerTest,
        linkedinConnection: linkedinTest
      }
    });
    
  } catch (error) {
    console.error('Scraping test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Scraping test failed',
      error: error.message
    });
  }
});

// Test specific job site connectivity
router.get('/test-site/:site', auth, isAdmin, async (req, res) => {
  try {
    const { site } = req.params;
    console.log(`Testing ${site} connectivity...`);
    
    const testResult = await testJobSite(site);
    
    res.json({
      success: true,
      message: `${site} test completed`,
      data: testResult
    });
    
  } catch (error) {
    console.error(`${req.params.site} test failed:`, error.message);
    res.status(500).json({
      success: false,
      message: `${req.params.site} test failed`,
      error: error.message
    });
  }
});

// İş ilanlarını çekme ve kaydetme rotası (Admin yetkisi gerekli) - EXTERNAL WEB SCRAPING
// POST /api/jobs/scrape
// Body: { source: 'kariyernet' | 'linkedin' | 'all', keyword?: string }
router.post('/scrape', auth, isAdmin, async (req, res) => {
  const { source = 'all', keyword = '' } = req.body; // Default değerler eklendi

  if (!source || !['kariyernet', 'linkedin', 'all'].includes(source)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Geçerli bir kaynak belirtmelisiniz (kariyernet, linkedin veya all).' 
    });
  }

  if (!keyword || keyword.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Arama yapmak için anahtar kelime zorunludur.' 
    });
  }

  try {
    console.log(`${source} kaynağından external web scraping başlatılıyor... Anahtar kelime: ${keyword}`);

    // Call the actual web scraping function
    const scrapingResult = await scrapeJobs({ source, keyword: keyword.trim() });
    
    const { scrapedJobs, savedResults, errors } = scrapingResult;

    // Calculate statistics from actual scraping results
    const stats = {
      scrapedCount: scrapedJobs.length,
      savedCount: savedResults ? savedResults.filter(r => r && r.success).length : 0,
      createdCount: savedResults ? savedResults.filter(r => r && r.status === 'created').length : 0,
      updatedCount: savedResults ? savedResults.filter(r => r && r.status === 'updated').length : 0,
      errorCount: errors ? errors.length : 0
    };

    const response = {
      success: true,
      message: `${source} kaynağından ${stats.scrapedCount} ilan bulundu. ${stats.createdCount} yeni eklendi, ${stats.updatedCount} güncellendi.`,
      data: {
        scrapedCount: stats.scrapedCount,
        savedCount: stats.savedCount,
        createdCount: stats.createdCount,
        updatedCount: stats.updatedCount,
        errorCount: stats.errorCount,
        results: scrapedJobs.slice(0, 20) // Return first 20 for display
      },
      errors: errors || []
    };

    console.log(`📊 External Web Scraping: ${stats.scrapedCount} ilanlar bulundu, ${stats.createdCount} yeni, ${stats.updatedCount} güncellendi`);

    res.json(response);

  } catch (error) {
    console.error(`${source} external web scraping hatası:`, error.message);
    res.status(500).json({ 
      success: false, 
      message: `${source} kaynağından web scraping sırasında bir hata oluştu: ${error.message}`,
      error: error.message 
    });
  }
});

module.exports = router; 