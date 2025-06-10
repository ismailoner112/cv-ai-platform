// backend/scrape/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const { randomUserAgent } = require('../utils/userAgents');
const Announcement = require('../models/Announcement');
const slugify = require('slugify');

// Basitleştirilmiş rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 30, // Daha yavaş scraping
  delayBetweenRequests: 2000 // 2 saniye bekleme
};

// Create axios instance with proper configuration
const createAxiosInstance = () => {
  const config = {
    headers: {
      'User-Agent': randomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    },
    timeout: 30000, // 30 saniye timeout
    maxRedirects: 5,
    validateStatus: function (status) {
      return status >= 200 && status < 400; // 2xx ve 3xx status kodlarını kabul et
    }
  };

  return axios.create(config);
};

// Basitleştirilmiş rate limiting helper
const rateLimiter = {
  lastRequestTime: 0,

  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT.delayBetweenRequests) {
      const waitTime = RATE_LIMIT.delayBetweenRequests - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
};

// Error handling helper
const handleScrapingError = (error, source) => {
  console.error(`[${source}] Scraping error:`, error.message);
  
  if (error.response) {
    console.error(`[${source}] Response status:`, error.response.status);
    if (error.response.status === 403) {
      console.log(`[${source}] Access denied - site may have anti-bot protection`);
    }
  }
  
  return { success: false, message: `${source} sitesinden veri çekilemedi: ${error.message}` };
};

// Save job to database
const saveJob = async (jobData) => {
  try {
    // URL'yi kontrol et ve düzelt
    if (!jobData.url || jobData.url.trim() === '') {
      console.error(`❌ [${jobData.source}] URL is empty for job: ${jobData.title}`);
      return { success: false, status: 'error', error: 'URL boş olamaz' };
    }

    // URL formatını kontrol et ve düzelt
    let cleanUrl = jobData.url.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    // originalUrl'yi de kontrol et
    let cleanOriginalUrl = jobData.originalUrl || cleanUrl;
    if (!cleanOriginalUrl.startsWith('http')) {
      cleanOriginalUrl = 'https://' + cleanOriginalUrl;
    }

    // Check if announcement with the same source and originalUrl already exists
    const existingAnn = await Announcement.findOne({
        source: jobData.source,
        originalUrl: cleanOriginalUrl
    });

    if (existingAnn) {
        // Update existing announcement
        existingAnn.title = jobData.title || existingAnn.title;
        existingAnn.company = jobData.company || existingAnn.company;
        existingAnn.location = jobData.location || existingAnn.location;
        existingAnn.publishDate = jobData.publishDate || existingAnn.publishDate;
        existingAnn.jobType = 'iş-ilanı'; // Sabit değer
        existingAnn.salary = jobData.salary || existingAnn.salary;
        existingAnn.experience = jobData.experience || existingAnn.experience;
        existingAnn.description = jobData.description || existingAnn.description;
        existingAnn.lastScrapedAt = new Date();
        
        // Add new skills if not already present
        if (jobData.skills && jobData.skills.length > 0) {
            jobData.skills.forEach(skill => {
                if (!existingAnn.skills.includes(skill)) {
                    existingAnn.skills.push(skill);
                }
            });
        }
        
        await existingAnn.save();
        console.log(`🔄 [${jobData.source}] Updated: ${jobData.company} — ${jobData.title}`);
        return { success: true, status: 'updated' };

    } else {
         // Generate slug only for new jobs
        const slug = slugify(`${jobData.company}-${jobData.title}-${Date.now()}`, {
            lower: true,
            strict: true,
            locale: 'tr'
        });

        const newAnn = new Announcement({
            title: jobData.title,
            company: jobData.company,
            location: jobData.location || 'Belirtilmemiş',
            url: cleanUrl, // Temizlenmiş URL
            originalUrl: cleanOriginalUrl, // Temizlenmiş originalUrl
            publishDate: jobData.publishDate || new Date(),
            source: jobData.source,
            jobType: 'iş-ilanı', // Sabit değer
            salary: jobData.salary,
            experience: jobData.experience,
            education: jobData.education,
            skills: jobData.skills || [],
            benefits: jobData.benefits || [],
            description: jobData.description || 'Açıklama mevcut değil.',
            isPublished: true,
            slug: slug,
            scraped: true,
            lastScrapedAt: new Date(),
            keywords: jobData.keywords || [],
        });
        
        await newAnn.save();
        console.log(`✔️ [${jobData.source}] Created: ${jobData.company} — ${jobData.title}`);
        return { success: true, status: 'created' };
    }
  } catch (error) {
    // Validation hatalarını detaylandır
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error(`❌ [${jobData.source}] Validation error for ${jobData.title}:`, validationErrors.join(', '));
      return { success: false, status: 'error', error: `Validation hatası: ${validationErrors.join(', ')}` };
    }
    
    console.error(`❌ [${jobData.source}] Save error for ${jobData.title}:`, error.message);
    return { success: false, status: 'error', error: error.message };
  }
};

// Basit keyword matching fonksiyonu
const matchesKeyword = (text, keyword) => {
  if (!keyword || keyword.trim() === '') return true;
  
  const normalizedKeyword = keyword.toLowerCase().trim();
  const normalizedText = text.toLowerCase();
  
  // Exact match veya word boundary match
  return normalizedText.includes(normalizedKeyword);
};

// Generic scrape function for a given URL and selectors
const genericScrape = async (url, sourceName, selectors, keyword = '') => {
  console.log(`🚀 [${sourceName}] Starting scrape for keyword: "${keyword}"`);
  const scrapedJobs = [];
  const errors = [];

  try {
    await rateLimiter.wait();
    const axiosInstance = createAxiosInstance();
    
    const response = await axiosInstance.get(url);
    const { data } = response;
    
    if (!data || data.length < 100) {
      throw new Error('Boş veya geçersiz sayfa yanıtı alındı');
    }
    
    const $ = cheerio.load(data);

    const jobElements = $(selectors.job);
    console.log(`📄 [${sourceName}] Found ${jobElements.length} job elements`);

    if (jobElements.length === 0) {
      // Check if we hit an anti-bot page
      const pageText = $('body').text().toLowerCase();
      if (pageText.includes('bot') || pageText.includes('captcha') || pageText.includes('blocked')) {
        throw new Error('Anti-bot koruması tespit edildi');
      }
      console.log(`⚠️ [${sourceName}] No job elements found but no anti-bot detected`);
    }

    for (let i = 0; i < jobElements.length && i < 20; i++) { // Limit to first 20 jobs
      try {
        const elem = $(jobElements[i]);
        
        const title = elem.find(selectors.title).text().trim();
        const company = elem.find(selectors.company).text().trim();
        const location = elem.find(selectors.location).text().trim() || 'Belirtilmemiş';
        
        // Skip if essential data is missing
        if (!title || !company) {
          continue;
        }

        const jobUrlRelative = elem.find(selectors.url).attr('href');
        let jobUrl = '';
        
        // URL'yi düzgün şekilde oluştur
        if (jobUrlRelative) {
          if (jobUrlRelative.startsWith('http')) {
            jobUrl = jobUrlRelative;
          } else if (jobUrlRelative.startsWith('//')) {
            jobUrl = 'https:' + jobUrlRelative;
          } else if (jobUrlRelative.startsWith('/')) {
            const baseUrl = new URL(url);
            jobUrl = `${baseUrl.protocol}//${baseUrl.host}${jobUrlRelative}`;
          } else {
            jobUrl = new URL(jobUrlRelative, url).href;
          }
        }
        
        // URL hala boşsa, company ve title'dan URL oluştur
        if (!jobUrl || jobUrl.trim() === '') {
          const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
          const cleanCompany = company.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
          const baseUrl = new URL(url);
          jobUrl = `${baseUrl.protocol}//${baseUrl.host}/job/${cleanCompany}/${cleanTitle}/${Date.now()}`;
        }
        
        const publishDateText = elem.find(selectors.publishDate)?.text().trim();
        const publishDate = publishDateText ? new Date() : new Date(); // Use current date as fallback
        
        // Basic description from list view
        let description = elem.find(selectors.description || '.job-description')?.text().trim() || 'Açıklama mevcut değil.';
        
        // Limit description length
        if (description.length > 500) {
          description = description.substring(0, 500) + '...';
        }

        const jobData = {
          title,
          company,
          url: jobUrl, // Her zaman geçerli bir URL
          originalUrl: jobUrl, // originalUrl da aynı URL
          source: sourceName.toLowerCase(),
          jobType: 'iş-ilanı', // Validation'a uygun sabit değer
          publishDate,
          location,
          description,
          skills: [],
          benefits: [],
          keywords: keyword ? [keyword] : [],
        };

        // Keyword matching
        const titleMatch = matchesKeyword(title, keyword);
        const companyMatch = matchesKeyword(company, keyword);
        const descMatch = matchesKeyword(description, keyword);
        
        if (titleMatch || companyMatch || descMatch) {
          scrapedJobs.push(jobData);
          console.log(`✅ [${sourceName}] Matched: ${company} — ${title}`);
        }

      } catch (error) {
        errors.push({ source: sourceName, message: `Job processing error: ${error.message}` });
      }
    }

    console.log(`🎯 [${sourceName}] Completed. Found: ${scrapedJobs.length} matching jobs`);
    return { scrapedJobs, errors };

  } catch (error) {
    console.error(`❌ [${sourceName}] Scraping failed:`, error.message);
    const errResult = handleScrapingError(error, sourceName);
    errors.push({ source: sourceName, message: errResult.message });
    return { scrapedJobs: [], errors };
  }
};

// Central function to scrape jobs based on source and keyword
const scrapeJobs = async ({ source = 'all', keyword = '' }) => {
  console.log(`🎯 [Scrape Manager] Starting scraping for source: ${source}, keyword: "${keyword}"`);
  let allScrapedJobs = [];
  let allErrors = [];

  // Güncel ve çalışan site selectors
  const sources = {
    kariyernet: {
      url: keyword ? 
        `https://www.kariyer.net/is-ilanlari?q=${encodeURIComponent(keyword)}` : 
        'https://www.kariyer.net/is-ilanlari',
      selectors: {
        job: '.list-items .list-item, .job-list-container .job-list-item, .jobs-list-item, [data-testid="job-card"]',
        title: '.job-title a, .list-item-title a, .job-card-title a, h3 a, .position-title a',
        url: '.job-title a, .list-item-title a, .job-card-title a, h3 a, .position-title a',
        company: '.company-name, .list-item-company, .job-card-company, .company a, .employer-name',
        location: '.job-location, .list-item-location, .job-card-location, .location, .city',
        publishDate: '.publish-date, .list-item-date, .job-card-date, .date, .posting-date',
        description: '.job-summary, .job-description, .list-item-description, .summary, .job-snippet',
      },
    },
    linkedin: {
      url: keyword ? 
        `https://tr.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=Turkey&f_TPR=r86400` :
        `https://tr.linkedin.com/jobs/search?location=Turkey&f_TPR=r86400`,
       selectors: {
        job: '.jobs-search__results-list .result-card, .job-search-card, .base-search-card, .job-card-container, [data-testid="job-card"], .jobs-search-results__list-item',
        title: '.result-card__title a, .base-search-card__title a, .job-card-title a, h3 a, .job-title a, .base-search-card__title',
        url: '.result-card__title a, a.base-card__full-link, .job-card-title a, h3 a, .base-search-card__title a',
        company: '.result-card__subtitle a, .base-search-card__subtitle a, .job-card-subtitle a, .company-name, .job-card-container__company-name, .base-search-card__subtitle',
        location: '.job-result-card__location, .job-search-card__location, .job-card-location, .location, .job-card-container__metadata-item, .base-search-card__metadata',
        publishDate: '.job-result-card__listdate, .job-search-card__listdate, .job-card-date, .published-date, .job-card-container__metadata-item time, .base-search-card__metadata time',
        description: '.job-result-card__snippet, .job-card-summary, .job-summary, .description, .job-card-container__job-insight, .base-search-card__snippet',
      },
    },
  };

  // Sırasıyla kaynakları kontrol et
  const sourcesToScrape = source === 'all' ? ['kariyernet', 'linkedin'] : [source];

  for (const sourceName of sourcesToScrape) {
    if (!sources[sourceName]) {
      allErrors.push({ source: sourceName, message: `Bilinmeyen kaynak: ${sourceName}` });
      continue;
    }

    try {
      const { scrapedJobs, errors } = await genericScrape(
        sources[sourceName].url,
        sourceName,
        sources[sourceName].selectors,
        keyword
      );
      
      allScrapedJobs = [...allScrapedJobs, ...scrapedJobs];
      allErrors = [...allErrors, ...errors];
      
      // Kaynaklarr arası kısa bekleme
      if (sourcesToScrape.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`❌ [${sourceName}] Scraping failed:`, error.message);
      allErrors.push({ source: sourceName, message: `Scraping failed: ${error.message}` });
    }
  }

  // After scraping, save all collected jobs
  const savedResults = [];
  for (const jobData of allScrapedJobs) {
      try {
        const saveResult = await saveJob(jobData);
        savedResults.push(saveResult);
        
        if (saveResult.status === 'error') {
            allErrors.push({ 
              source: jobData.source, 
              message: `Save failed for ${jobData.title}: ${saveResult.error}` 
            });
        }
      } catch (saveError) {
        console.error(`❌ [${jobData.source}] Critical save error:`, saveError.message);
        allErrors.push({ 
          source: jobData.source, 
          message: `Critical save error for ${jobData.title}: ${saveError.message}` 
        });
      }
  }

  const stats = {
    scrapedCount: allScrapedJobs.length,
    savedCount: savedResults.filter(r => r.success).length,
    createdCount: savedResults.filter(r => r.status === 'created').length,
    updatedCount: savedResults.filter(r => r.status === 'updated').length,
    errorCount: allErrors.length
  };

  console.log(`📈 [Scrape Manager] Final: ${stats.scrapedCount} scraped, ${stats.createdCount} created, ${stats.updatedCount} updated, ${stats.errorCount} errors`);

  // Return combined results and errors
  return { scrapedJobs: allScrapedJobs, savedResults, errors: allErrors };
};

// Export the central function
module.exports = {
  scrapeJobs,
  
  // Test function for debugging
  testScrape: async (testUrl = 'https://httpbin.org/html') => {
    console.log('🧪 Testing basic scraping functionality...');
    try {
      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get(testUrl);
      const $ = cheerio.load(response.data);
      
      return {
        success: true,
        status: response.status,
        title: $('title').text() || 'No title found',
        bodyLength: $('body').text().length,
        userAgent: response.config.headers['User-Agent']
      };
    } catch (error) {
      console.error('Test scraping failed:', error.message);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'No response'
      };
    }
  },
  
  // Simple job site test
  testJobSite: async (site = 'kariyernet') => {
    console.log(`🧪 Testing ${site} connection...`);
    
    const testUrls = {
      kariyernet: 'https://www.kariyer.net/is-ilanlari',
      linkedin: 'https://www.linkedin.com/jobs/'
    };
    
    const url = testUrls[site];
    if (!url) return { success: false, error: 'Unknown site' };
    
    try {
      const axiosInstance = createAxiosInstance();
      console.log(`Testing ${url}...`);
      
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      
      // Basic page analysis
      const title = $('title').text();
      const bodyText = $('body').text();
      const hasJobElements = $('.job, .result-card, .list-item, [data-testid="job-card"]').length > 0;
      
      // Check for common anti-bot indicators
      const isBlocked = bodyText.toLowerCase().includes('bot') || 
                       bodyText.toLowerCase().includes('captcha') ||
                       bodyText.toLowerCase().includes('blocked') ||
                       bodyText.toLowerCase().includes('access denied');
      
      return {
        success: true,
        site,
        status: response.status,
        title: title.substring(0, 100),
        hasJobElements,
        isBlocked,
        bodyLength: bodyText.length,
        responseTime: response.headers['response-time'] || 'N/A'
      };
      
    } catch (error) {
      console.error(`${site} test failed:`, error.message);
      return {
        success: false,
        site,
        error: error.message,
        status: error.response?.status || 'No response',
        isTimeout: error.code === 'ECONNABORTED'
      };
    }
  }
};
    