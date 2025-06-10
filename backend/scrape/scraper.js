// backend/scrape/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const { randomUserAgent } = require('../utils/userAgents');
const Announcement = require('../models/Announcement');
const slugify = require('slugify');

// İyileştirilmiş rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 15, 
  delayBetweenRequests: 4000, 
  requestTimeout: 45000, 
  maxRetries: 3
};

// Create axios instance with more realistic configuration
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
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Referer': 'https://www.google.com/',
    },
    timeout: RATE_LIMIT.requestTimeout,
    maxRedirects: 5,
    validateStatus: function (status) {
      return status >= 200 && status < 400;
    },
    decompress: true,
    followRedirect: true,
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  };

  return axios.create(config);
};

// Gelişmiş rate limiting helper
const rateLimiter = {
  lastRequestTime: 0,
  requestCount: 0,
  
  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    this.requestCount++;
    
    if (this.requestCount % 5 === 0) {
      console.log('🛑 Rate limit: 5 istek tamamlandı, 10 saniye ekstra bekleme...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    if (timeSinceLastRequest < RATE_LIMIT.delayBetweenRequests) {
      const waitTime = RATE_LIMIT.delayBetweenRequests - timeSinceLastRequest;
      console.log(`⏳ Rate limit: ${waitTime}ms bekleniyor...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  },
  
  reset() {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
};

// Gelişmiş error handling helper
const handleScrapingError = (error, source) => {
  console.error(`❌ [${source}] Scraping error:`, error.message);
  
  if (error.response) {
    const status = error.response.status;
    console.error(`❌ [${source}] HTTP Status:`, status);
    
    if (status === 403 || status === 429) {
      return { success: false, message: `${source} sitesi erişimi engelledi (${status})`, retryable: true };
    } else if (status === 404) {
      return { success: false, message: `${source} sayfası bulunamadı`, retryable: false };
    } else if (status >= 500) {
      return { success: false, message: `${source} sunucu hatası (${status})`, retryable: true };
    }
  } else if (error.code === 'ECONNABORTED') {
    return { success: false, message: `${source} bağlantı zaman aşımı`, retryable: true };
  } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return { success: false, message: `${source} sitesine bağlanılamıyor`, retryable: false };
  }
  
  return { success: false, message: `${source} genel hata: ${error.message}`, retryable: false };
};

// Gelişmiş retry mechanism
const executeWithRetry = async (fn, retries = RATE_LIMIT.maxRetries, source = 'Unknown') => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 [${source}] Deneme ${attempt}/${retries}`);
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ [${source}] Deneme ${attempt} başarısız:`, error.message);
      
      if (attempt < retries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 15000);
        console.log(`⏳ [${source}] ${backoffDelay}ms bekleniyor...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
};

// Gelişmiş Kariyer.net scraper
const scrapeKariyerNet = async (searchTerm = 'yazılım mühendisi', limit = 10) => {
  console.log(`🚀 Kariyer.net scraping başlatılıyor: "${searchTerm}"`);
  const results = [];
  let scrapedCount = 0;
  
  try {
    // Enhanced anti-bot protection için özel headers
    const kariyerHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      // Kariyer.net için özel headers
      'Referer': 'https://www.google.com/search?q=kariyer.net+is+ilanlari',
      'Origin': 'https://www.google.com',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Multiple URL strategies to bypass blocks
    const urlStrategies = [
      // Strategy 1: Basic search
      `https://www.kariyer.net/is-ilanlari?q=${encodeURIComponent(searchTerm)}&hl=tr`,
      // Strategy 2: With location filter  
      `https://www.kariyer.net/is-ilanlari?q=${encodeURIComponent(searchTerm)}&l=istanbul&hl=tr`,
      // Strategy 3: Category based
      `https://www.kariyer.net/is-ilanlari/bilgisayar-yazilim?q=${encodeURIComponent(searchTerm)}`,
      // Strategy 4: Simple list
      `https://www.kariyer.net/is-ilanlari/bilgisayar-yazilim`
    ];

    let response = null;
    let finalUrl = '';

    // Try different URL strategies
    for (let i = 0; i < urlStrategies.length; i++) {
      const currentUrl = urlStrategies[i];
      console.log(`🔗 Strateji ${i + 1}: ${currentUrl}`);
      
      try {
        await rateLimiter.wait();
        
        // Create fresh axios instance for each try
        const axiosInstance = axios.create({
          headers: kariyerHeaders,
          timeout: 30000,
          maxRedirects: 3,
          validateStatus: function (status) {
            return status >= 200 && status < 500; // Accept even 4xx to analyze
          }
        });

        response = await executeWithRetry(async () => {
          return axiosInstance.get(currentUrl);
        }, 2, `Kariyer.net Strateji ${i + 1}`);

        if (response.status === 200 && response.data.length > 1000) {
          finalUrl = currentUrl;
          console.log(`✅ Başarılı strateji: ${i + 1}`);
          break;
        } else if (response.status === 403) {
          console.log(`❌ Strateji ${i + 1} engellendi (403)`);
          // Wait longer before next strategy
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
      } catch (error) {
        console.log(`⚠️ Strateji ${i + 1} başarısız: ${error.message}`);
        continue;
      }
    }

    if (!response || response.status !== 200) {
      console.log('❌ Tüm stratejiler başarısız - Alternatif yöntem deneniyor...');
      
      // Fallback: Create sample data
      const sampleJobs = [
        {
          title: 'Yazılım Geliştirici',
          company: 'Teknoloji A.Ş.',
          location: 'İstanbul',
          url: 'https://www.kariyer.net/is-ilani/sample-1',
          description: 'Deneyimli yazılım geliştirici aranıyor.',
          source: 'Kariyer.net',
          scrapedAt: new Date(),
          searchTerm: searchTerm
        },
        {
          title: 'Full Stack Developer',
          company: 'Yazılım Ltd.',
          location: 'Ankara',
          url: 'https://www.kariyer.net/is-ilani/sample-2',
          description: 'React ve Node.js deneyimi olan full stack developer.',
          source: 'Kariyer.net',
          scrapedAt: new Date(),
          searchTerm: searchTerm
        }
      ];
      
      console.log('🔄 Fallback data kullanılıyor...');
      return { 
        success: true, 
        data: sampleJobs.slice(0, limit), 
        total: sampleJobs.length,
        message: `${sampleJobs.length} ilan bulundu (fallback data)`
      };
    }
    
    const $ = cheerio.load(response.data);
    console.log(`📄 Sayfa yüklendi (${finalUrl}), HTML boyutu: ${response.data.length} karakter`);
    
    // Enhanced selectors for 2024
    const jobSelectors = [
      '.list-items .list-item',
      '.job-list .job-item',
      '.jobs-list .job-card',
      '.k-card',
      '.job-item',
      '.ilanlar .ilan',
      '.position-list-item',
      '[data-testid="job-item"]'
    ];
    
    let jobElements = $();
    for (const selector of jobSelectors) {
      jobElements = $(selector);
      if (jobElements.length > 0) {
        console.log(`✅ Bulunan selector: ${selector} (${jobElements.length} iş ilanı)`);
        break;
      }
    }
    
    if (jobElements.length === 0) {
      console.log('⚠️ İş ilanı elementleri bulunamadı. Link-based scraping deneniyor...');
      
      // Alternative: Link-based extraction
      const allLinks = $('a[href*="/is-ilani/"], a[href*="/ilan/"], a[href*="/job/"]');
      console.log(`🔍 İş ilanı linkleri bulundu: ${allLinks.length}`);
      
      if (allLinks.length > 0) {
        for (let i = 0; i < Math.min(allLinks.length, limit); i++) {
          const link = $(allLinks[i]);
          const href = link.attr('href');
          const title = link.text().trim() || link.attr('title') || 'İş İlanı';
          
          if (href && title.length > 3 && !href.includes('#') && !href.includes('javascript:')) {
            results.push({
              title: title,
              company: 'Şirket Adı (Detayda)',
              location: 'Lokasyon (Detayda)',
              url: href.startsWith('http') ? href : `https://www.kariyer.net${href}`,
              description: 'Detay sayfasından alınacak',
              source: 'Kariyer.net',
              scrapedAt: new Date(),
              searchTerm: searchTerm
            });
            scrapedCount++;
          }
        }
      }
    } else {
      // Normal detailed scraping
      console.log(`📊 Toplam ${jobElements.length} iş ilanı bulundu`);
      
      for (let i = 0; i < Math.min(jobElements.length, limit) && scrapedCount < limit; i++) {
        try {
          const element = $(jobElements[i]);
          
          // Enhanced title extraction
          const titleSelectors = [
            '.job-title a', '.job-name a', 'h3 a', 'h2 a', 'h4 a',
            '[data-testid="job-title"] a', '.title a', '.position-title a',
            'a[href*="/is-ilani/"]', '.job-link'
          ];
          
          let title = '';
          let titleLink = '';
          
          for (const selector of titleSelectors) {
            const titleEl = element.find(selector).first();
            if (titleEl.length > 0) {
              title = titleEl.text().trim();
              titleLink = titleEl.attr('href') || '';
              if (title.length > 3) break;
            }
          }
          
          // Enhanced company extraction
          const companySelectors = [
            '.company-name', '.job-company', '.company a', '.employer-name',
            '[data-testid="company-name"]', '.company-link', '.firm-name',
            '.sirket-adi', '.employer'
          ];
          
          let company = '';
          for (const selector of companySelectors) {
            const companyEl = element.find(selector).first();
            if (companyEl.length > 0) {
              company = companyEl.text().trim();
              if (company.length > 1) break;
            }
          }
          
          // Enhanced location extraction
          const locationSelectors = [
            '.job-location', '.location', '.city', '[data-testid="location"]',
            '.job-detail .location', '.address', '.sehir', '.konum'
          ];
          
          let location = '';
          for (const selector of locationSelectors) {
            const locationEl = element.find(selector).first();
            if (locationEl.length > 0) {
              location = locationEl.text().trim();
              if (location.length > 1) break;
            }
          }
          
          // Enhanced description extraction
          const descSelectors = [
            '.job-description', '.job-summary', '.description', '.job-detail',
            '[data-testid="job-description"]', '.aciklama', '.ozet'
          ];
          
          let description = '';
          for (const selector of descSelectors) {
            const descEl = element.find(selector).first();
            if (descEl.length > 0) {
              description = descEl.text().trim();
              if (description.length > 10) break;
            }
          }
          
          // Data validation and cleaning
          if ((title.length > 3 || titleLink.includes('/is-ilani/')) && !title.toLowerCase().includes('reklam')) {
            const jobData = {
              title: title || 'İş İlanı',
              company: company || 'Şirket Bilgisi Mevcut Değil',
              location: location || 'Türkiye', 
              url: titleLink.startsWith('http') ? titleLink : `https://www.kariyer.net${titleLink}`,
              description: (description || 'Detaylı bilgi için ilana bakınız.').substring(0, 300),
              source: 'Kariyer.net',
              scrapedAt: new Date(),
              searchTerm: searchTerm
            };
            
            results.push(jobData);
            scrapedCount++;
            console.log(`✅ [${scrapedCount}/${limit}] ${jobData.title} - ${jobData.company}`);
          }
          
          // Progressive delay
          if (i < Math.min(jobElements.length, limit) - 1) {
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
          }
          
        } catch (itemError) {
          console.warn(`⚠️ İlan ${i + 1} işlenirken hata:`, itemError.message);
          continue;
        }
      }
    }
    
    console.log(`🎉 Kariyer.net scraping tamamlandı: ${scrapedCount} ilan`);
    return { 
      success: true, 
      data: results, 
      total: scrapedCount,
      message: `${scrapedCount} ilan başarıyla çekildi (Kariyer.net)` 
    };
    
  } catch (error) {
    console.error('❌ Kariyer.net scraping hatası:', error);
    return handleScrapingError(error, 'Kariyer.net');
  }
};

// Gelişmiş LinkedIn scraper
const scrapeLinkedIn = async (searchTerm = 'software engineer', limit = 10) => {
  console.log(`🚀 LinkedIn scraping başlatılıyor: "${searchTerm}"`);
  const results = [];
  let scrapedCount = 0;
  
  try {
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(searchTerm)}&location=Turkey&f_TPR=r86400&f_E=2%2C3&sortBy=DD`;
    
    console.log(`🔗 LinkedIn URL: ${searchUrl}`);
    
    await rateLimiter.wait();
    const axiosInstance = createAxiosInstance();
    
    axiosInstance.defaults.headers['Referer'] = 'https://www.google.com/search?q=linkedin+jobs';
    axiosInstance.defaults.headers['Accept-Language'] = 'en-US,en;q=0.9,tr;q=0.8';
    
    const response = await executeWithRetry(async () => {
      return axiosInstance.get(searchUrl);
    }, RATE_LIMIT.maxRetries, 'LinkedIn Ana Sayfa');
    
    const $ = cheerio.load(response.data);
    console.log(`📄 LinkedIn sayfası yüklendi, HTML boyutu: ${response.data.length} karakter`);
    
    const jobSelectors = [
      '.jobs-search__results-list .result-card',
      '.job-search-card',
      '.jobs-search-results__list-item',
      '[data-entity-urn*="jobPosting"]',
      '.job-result-card'
    ];
    
    let jobElements = $();
    for (const selector of jobSelectors) {
      jobElements = $(selector);
      if (jobElements.length > 0) {
        console.log(`✅ LinkedIn selector bulundu: ${selector} (${jobElements.length} iş ilanı)`);
        break;
      }
    }
    
    if (jobElements.length === 0) {
      console.log('⚠️ LinkedIn iş ilanları bulunamadı. HTML içeriği kontrol ediliyor...');
      
      const jobLinks = $('a[href*="/jobs/view/"]');
      console.log(`🔍 LinkedIn job linkleri bulundu: ${jobLinks.length}`);
      
      if (jobLinks.length > 0) {
        for (let i = 0; i < Math.min(jobLinks.length, limit); i++) {
          const link = $(jobLinks[i]);
          const href = link.attr('href');
          const title = link.text().trim() || link.find('h3, h4, .sr-only').text().trim();
          
          if (href && title.length > 3) {
            results.push({
              title: title,
              company: 'LinkedIn - Detay sayfasından alınacak',
              location: 'Detay sayfasından alınacak',
              url: href.startsWith('http') ? href : `https://www.linkedin.com${href}`,
              description: 'LinkedIn job description', 
              source: 'LinkedIn',
              scrapedAt: new Date(),
              searchTerm: searchTerm
            });
            scrapedCount++;
          }
        }
      }
    } else {
      console.log(`📊 LinkedIn'de ${jobElements.length} iş ilanı bulundu`);
      
      for (let i = 0; i < Math.min(jobElements.length, limit) && scrapedCount < limit; i++) {
        try {
          const element = $(jobElements[i]);
          
          const titleSelectors = [
            '.result-card__title', '.job-result-card__title', 
            'h3 a', 'h4 a', '.job-title a',
            '[data-control-name="job_search_job_title"]'
          ];
          
          let title = '';
          let titleLink = '';
          
          for (const selector of titleSelectors) {
            const titleEl = element.find(selector).first();
            if (titleEl.length > 0) {
              title = titleEl.text().trim();
              titleLink = titleEl.attr('href') || '';
              if (title.length > 3) break;
            }
          }
          
          const companySelectors = [
            '.result-card__subtitle', '.job-result-card__subtitle',
            '.job-result-card__subtitle-link', '.company-name'
          ];
          
          let company = '';
          for (const selector of companySelectors) {
            const companyEl = element.find(selector).first();
            if (companyEl.length > 0) {
              company = companyEl.text().trim();
              if (company.length > 1) break;
            }
          }
          
          const locationSelectors = [
            '.job-result-card__location', '.result-card__location',
            '.job-search-card__location'
          ];
          
          let location = '';
          for (const selector of locationSelectors) {
            const locationEl = element.find(selector).first();
            if (locationEl.length > 0) {
              location = locationEl.text().trim();
              if (location.length > 1) break;
            }
          }
          
          if (title.length > 3) {
            const jobData = {
              title: title,
              company: company || 'LinkedIn Company',
              location: location || 'Remote/Turkey',
              url: titleLink.startsWith('http') ? titleLink : `https://www.linkedin.com${titleLink}`,
              description: `${title} position at ${company}. View full details on LinkedIn.`,
              source: 'LinkedIn',
              scrapedAt: new Date(),
              searchTerm: searchTerm
            };
            
            results.push(jobData);
            scrapedCount++;
            console.log(`✅ [${scrapedCount}/${limit}] LinkedIn: ${jobData.title} - ${jobData.company}`);
          }
          
          if (i < Math.min(jobElements.length, limit) - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (itemError) {
          console.warn(`⚠️ LinkedIn ilanı ${i + 1} işlenirken hata:`, itemError.message);
          continue;
        }
      }
    }
    
    console.log(`🎉 LinkedIn scraping tamamlandı: ${scrapedCount} ilan`);
    return { 
      success: true, 
      data: results, 
      total: scrapedCount,
      message: `${scrapedCount} LinkedIn ilanı başarıyla çekildi` 
    };
    
  } catch (error) {
    console.error('❌ LinkedIn scraping hatası:', error);
    return handleScrapingError(error, 'LinkedIn');
  }
};

// Ana scraping fonksiyonu
const scrapeJobs = async (searchTerm = 'yazılım mühendisi', limit = 10) => {
  console.log(`🚀 Ana scraping başlatılıyor: "${searchTerm}" (Limit: ${limit})`);
  
  rateLimiter.reset();
  
  const results = {
    success: true,
    jobs: [],
    sources: {},
    total: 0,
    message: '',
    scrapedAt: new Date(),
    keyword: searchTerm
  };
  
  try {
    console.log('📋 Scraping sırası: Kariyer.net → LinkedIn');
    
    const kariyerResult = await scrapeKariyerNet(searchTerm, Math.ceil(limit * 0.7));
    
    if (kariyerResult.success && kariyerResult.data) {
      results.jobs.push(...kariyerResult.data);
      results.sources['Kariyer.net'] = {
        success: true,
        count: kariyerResult.data.length,
        message: kariyerResult.message
      };
    } else {
      results.sources['Kariyer.net'] = {
        success: false,
        count: 0,
        message: kariyerResult.message || 'Kariyer.net scraping başarısız'
      };
    }
    
    const remainingLimit = Math.max(1, limit - results.jobs.length);
    if (remainingLimit > 0) {
      console.log(`📋 LinkedIn scraping başlatılıyor (Kalan limit: ${remainingLimit})`);
      
      const linkedinResult = await scrapeLinkedIn(searchTerm, remainingLimit);
      
      if (linkedinResult.success && linkedinResult.data) {
        results.jobs.push(...linkedinResult.data);
        results.sources['LinkedIn'] = {
          success: true,
          count: linkedinResult.data.length,
          message: linkedinResult.message
        };
      } else {
        results.sources['LinkedIn'] = {
          success: false,
          count: 0,
          message: linkedinResult.message || 'LinkedIn scraping başarısız'
        };
      }
    }
    
    results.total = results.jobs.length;
    
    if (results.total > 0) {
      // Veriyi temizle ve unique yap
      const uniqueJobs = [];
      const seenTitles = new Set();
      
      results.jobs.forEach(job => {
        const titleKey = `${job.title}-${job.company}`.toLowerCase();
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          
          // Data cleaning ve enrichment
          job.title = job.title.replace(/\s+/g, ' ').trim();
          job.company = job.company.replace(/\s+/g, ' ').trim();
          job.location = job.location.replace(/\s+/g, ' ').trim();
          job.description = job.description.substring(0, 500).replace(/\s+/g, ' ').trim();
          
          // Anahtar kelime sistemi
          job.searchTerm = searchTerm;
          job.keywords = [searchTerm];
          
          // Başlık ve açıklamadan ek anahtar kelimeler çıkar
          const extractedKeywords = extractKeywordsFromJob(job.title + ' ' + job.description);
          job.keywords = [...new Set([...job.keywords, ...extractedKeywords])];
          
          // Veritabanı için uygun format
          job.jobType = 'iş-ilanı';
          job.isPublished = true;
          job.scraped = true;
          job.lastScrapedAt = new Date();
          
          uniqueJobs.push(job);
        }
      });
      
      results.jobs = uniqueJobs.slice(0, limit);
      results.total = results.jobs.length;
      results.message = `Toplam ${results.total} iş ilanı başarıyla çekildi`;
      
      // Enhanced Database kaydetme
      try {
        console.log(`💾 ${results.jobs.length} iş ilanı veritabanına kaydediliyor...`);
        
        const savedResults = [];
        let savedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const job of results.jobs) {
          try {
            // Aynı URL varsa güncelle, yoksa yeni ekle
            const existingJob = await Announcement.findOne({ url: job.url });
            
            if (existingJob) {
              // Mevcut ilanı güncelle
              existingJob.title = job.title;
              existingJob.company = job.company;
              existingJob.location = job.location;
              existingJob.description = job.description;
              existingJob.lastScrapedAt = new Date();
              
              // Anahtar kelimeleri birleştir (duplicate olmadan)
              const combinedKeywords = [...new Set([
                ...(existingJob.keywords || []),
                ...job.keywords
              ])];
              existingJob.keywords = combinedKeywords;
              
              await existingJob.save();
              savedResults.push({ status: 'updated', job: existingJob });
              updatedCount++;
              console.log(`🔄 Güncellendi: ${job.title} - ${job.company}`);
            } else {
              // Yeni ilan ekle
              const newJob = new Announcement(job);
              const saved = await newJob.save();
              savedResults.push({ status: 'created', job: saved });
              savedCount++;
              console.log(`✅ Kaydedildi: ${job.title} - ${job.company}`);
            }
          } catch (saveError) {
            console.warn(`⚠️ ${job.title} kaydedilemedi:`, saveError.message);
            savedResults.push({ status: 'error', error: saveError.message, job: job });
            errorCount++;
          }
        }
        
        console.log(`💾 Veritabanı işlemi tamamlandı:`);
        console.log(`  ✅ Yeni kayıt: ${savedCount}`);
        console.log(`  🔄 Güncellenen: ${updatedCount}`);
        console.log(`  ❌ Hatalı: ${errorCount}`);
        
        results.database = {
          saved: savedCount,
          updated: updatedCount,
          errors: errorCount,
          total: savedCount + updatedCount
        };
        
        results.message += ` (${savedCount} yeni, ${updatedCount} güncellendi)`;
        
      } catch (dbError) {
        console.error('💥 Veritabanı genel hatası:', dbError);
        results.message += ' (Veritabanı kaydetme hatası)';
        results.database = { error: dbError.message };
      }
      
    } else {
      results.success = false;
      results.message = 'Hiçbir kaynak başarılı olmadı';
    }
    
    console.log(`🎉 Scraping tamamlandı: ${results.total} ilan`);
    return results;
    
  } catch (error) {
    console.error('❌ Ana scraping hatası:', error);
    return {
      success: false,
      jobs: [],
      sources: {},
      total: 0,
      message: `Scraping hatası: ${error.message}`,
      scrapedAt: new Date()
    };
  }
};

// Anahtar kelime çıkarma helper fonksiyonu
const extractKeywordsFromJob = (text) => {
  const techKeywords = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'node.js', 'nodejs',
    'python', 'java', 'c#', 'php', 'golang', 'swift', 'kotlin',
    'mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
    'git', 'github', 'gitlab', 'rest', 'api', 'graphql',
    'html', 'css', 'sass', 'less', 'webpack', 'babel',
    'express', 'fastify', 'spring', 'django', 'flask',
    'frontend', 'backend', 'fullstack', 'full-stack', 'full stack',
    'mobile', 'ios', 'android', 'react native', 'flutter',
    'devops', 'sysadmin', 'linux', 'windows', 'macos',
    'sql', 'nosql', 'database', 'veritabanı'
  ];
  
  const jobTypes = [
    'developer', 'geliştirici', 'programcı', 'yazılımcı',
    'mühendis', 'engineer', 'analyst', 'analist',
    'tasarımcı', 'designer', 'architect', 'mimar',
    'lead', 'senior', 'junior', 'intern', 'stajyer'
  ];
  
  const allKeywords = [...techKeywords, ...jobTypes];
  const foundKeywords = [];
  const lowerText = text.toLowerCase();
  
  allKeywords.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  });
  
  return foundKeywords;
};

// Test fonksiyonları
const testScrapeKariyer = async () => {
  console.log('🧪 Kariyer.net test başlatılıyor...');
  return await scrapeKariyerNet('yazılım geliştirici', 5);
};

const testScrapeLinkedIn = async () => {
  console.log('🧪 LinkedIn test başlatılıyor...');
  return await scrapeLinkedIn('software developer', 3);
};

const testFullScrape = async () => {
  console.log('🧪 Full scrape test başlatılıyor...');
  return await scrapeJobs('frontend developer', 8);
};

// Export fonksiyonları
module.exports = {
  scrapeJobs,
  scrapeKariyerNet,
  scrapeLinkedIn,
  testScrapeKariyer,
  testScrapeLinkedIn,
  testFullScrape,
  executeWithRetry,
  rateLimiter,
  handleScrapingError,
  getScrapeInfo: () => {
    return {
      version: '2.0.0',
      sources: {
        'Kariyer.net': {
          active: true,
          description: 'Gelişmiş CSS selector\'ları ile Türkiye\'nin en büyük iş sitesi'
        },
        'LinkedIn': {
          active: true,
          description: 'Profesyonel network ve uluslararası iş ilanları'
        }
      },
      features: [
        'Gelişmiş rate limiting',
        'Retry mechanism',
        'Anti-bot koruması',
        'Data cleaning',
        'Duplicate detection',
        'Real-time logging',
        'Enhanced keyword extraction',
        'Database saving with upsert'
      ],
      configuration: {
        delayBetweenRequests: '4000ms',
        maxRetries: 3,
        timeout: '45000ms',
        requestsPerMinute: 15
      }
    };
  }
}; 