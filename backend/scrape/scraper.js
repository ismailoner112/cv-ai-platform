// backend/scrape/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const HttpsProxyAgent = require('https-proxy-agent');
const { randomUserAgent } = require('../utils/userAgents');
const Announcement = require('../models/Announcement');
const slugify = require('slugify');

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 30,
  delayBetweenRequests: 2000 // 2 seconds
};

// Proxy configuration
const PROXY_LIST = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [];
const USE_PROXY = process.env.USE_PROXY === 'true';

// Helper function to get random proxy
const getRandomProxy = () => {
  if (!PROXY_LIST.length) return null;
  const randomIndex = Math.floor(Math.random() * PROXY_LIST.length);
  return PROXY_LIST[randomIndex];
};

// Create axios instance with proper configuration
const createAxiosInstance = (useProxy = USE_PROXY) => {
  const config = {
    headers: {
      'User-Agent': randomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    timeout: 10000, // 10 seconds timeout
  };

  if (useProxy) {
    const proxy = getRandomProxy();
    if (proxy) {
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
  }

  return axios.create(config);
};

// Rate limiting helper
const rateLimiter = {
  lastRequestTime: 0,
  requestCount: 0,
  resetTime: Date.now() + 60000, // Reset count every minute

  async wait() {
    const now = Date.now();
    
    // Reset counter if a minute has passed
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }

    // Check if we've hit the rate limit
    if (this.requestCount >= RATE_LIMIT.requestsPerMinute) {
      const waitTime = this.resetTime - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT.delayBetweenRequests) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT.delayBetweenRequests - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
};

// Error handling helper
const handleScrapingError = (error, source) => {
  console.error(`Scraping error for ${source}:`, error.message);
  
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response headers:', error.response.headers);
  }
  
  // Do NOT throw here, we want to collect errors
  return { success: false, message: `Failed to scrape ${source}: ${error.message}` };
};

// Save job to database
const saveJob = async (jobData) => {
  try {
    // Check if announcement with the same source and originalUrl already exists
    const existingAnn = await Announcement.findOne({
        source: jobData.source,
        originalUrl: jobData.originalUrl
    });

    if (existingAnn) {
        // Update existing announcement
        existingAnn.title = jobData.title || existingAnn.title;
        existingAnn.company = jobData.company || existingAnn.company;
        existingAnn.location = jobData.location || existingAnn.location;
        existingAnn.publishDate = jobData.publishDate || existingAnn.publishDate; // Keep existing if scraper didn't provide
        existingAnn.jobType = jobData.jobType || existingAnn.jobType;
        existingAnn.salary = jobData.salary || existingAnn.salary;
        existingAnn.experience = jobData.experience || existingAnn.experience;
        // Only add new skills/benefits if not already present
        if (jobData.skills && jobData.skills.length > 0) {
            jobData.skills.forEach(skill => {
                if (!existingAnn.skills.includes(skill)) {
                    existingAnn.skills.push(skill);
                }
            });
        }
         if (jobData.benefits && jobData.benefits.length > 0) {
            jobData.benefits.forEach(benefit => {
                if (!existingAnn.benefits.includes(benefit)) {
                    existingAnn.benefits.push(benefit);
                }
            });
        }
        existingAnn.description = jobData.description || existingAnn.description; // Update description
        existingAnn.lastScrapedAt = new Date(); // Update last scraped timestamp
        
        await existingAnn.save();
        console.log(`🔄 Updated: ${jobData.company} — ${jobData.title}`);
        return { success: true, status: 'updated' };

    } else {
         // Generate slug only for new jobs
        const slug = slugify(`${jobData.company}-${jobData.title}-${Date.now()}`, { // Add timestamp to ensure uniqueness
            lower: true,
            strict: true,
            locale: 'tr'
        });

        const newAnn = new Announcement({
            title: jobData.title,
            company: jobData.company,
            location: jobData.location,
            originalUrl: jobData.originalUrl,
            publishDate: jobData.publishDate || new Date(),
            source: jobData.source,
            jobType: jobData.jobType,
            salary: jobData.salary,
            experience: jobData.experience,
            education: jobData.education,
            skills: jobData.skills || [],
            benefits: jobData.benefits || [],
            description: jobData.description,
            isPublished: true,
            slug: slug,
            scraped: true,
            lastScrapedAt: new Date(),
            keywords: jobData.keywords || [], // Store keywords used for scraping
        });
        await newAnn.save();
        console.log(`✔️ Saved: ${jobData.company} — ${jobData.title}`);
        return { success: true, status: 'created' };
    }
  } catch (error) {
    console.error('Error saving job:', error);
    return { success: false, status: 'error', error: error.message };
  }
};

// Helper function to extract job details from description
const extractJobDetails = (description) => {
  const details = {
    salary: null,
    experience: null,
    education: null,
    skills: [],
    benefits: []
  };

  if (!description) return details;

  // Salary extraction (improved regex)
  const salaryMatch = description.match(/(?:Maaş|Ücret|Salary)[:\s-]+([^\n.,;]+)/i);
  if (salaryMatch) details.salary = salaryMatch[1].trim();

  // Experience extraction (improved regex)
  const expMatch = description.match(/(?:Deneyim|Experience)[:\s-]+([^\n.,;]+)/i);
  if (expMatch) details.experience = expMatch[1].trim();

  // Education extraction (improved regex)
  const eduMatch = description.match(/(?:Eğitim|Education)[:\s-]+([^\n.,;]+)/i);
  if (eduMatch) details.education = eduMatch[1].trim();

  // Skills extraction (improved regex - tries to capture multi-line lists too)
  const skillsMatch = description.match(/(?:Yetenekler|Skills|Aranan Nitelikler|Gereklilikler)[:\s-]*\s*([\s\S]*?)(?:\n\n|\n\w+\s*:|Yan Haklar|Benefits|$)/i);
   if (skillsMatch && skillsMatch[1]) {
      details.skills = skillsMatch[1].split(/[\n,\-;•]/)
         .map(skill => skill.replace(/^\s*[-•]\s*/, '').trim())
         .filter(skill => skill.length > 0 && skill.toLowerCase() !== 'nitelikler');
   }

  // Benefits extraction (improved regex)
  const benefitsMatch = description.match(/(?:Yan Haklar|Benefits|Perks)[:\s-]*\s*([\s\S]*?)(?:\n\n|\n\w+\s*:|Yetenekler|Skills|$)/i);
   if (benefitsMatch && benefitsMatch[1]) {
      details.benefits = benefitsMatch[1].split(/[\n,\-;•]/)
         .map(benefit => benefit.replace(/^\s*[-•]\s*/, '').trim())
         .filter(benefit => benefit.length > 0 && benefit.toLowerCase() !== 'yan haklar');
   }

  return details;
};

// Generic scrape function for a given URL and selectors
const genericScrape = async (url, sourceName, selectors, keyword = '') => {
  console.log(`[${sourceName}] Scraping started. URL: ${url}, Searching for: ${keyword}`);
  const scrapedJobs = [];
  const errors = [];

  try {
    await rateLimiter.wait();
    const axiosInstance = createAxiosInstance();
    const { data } = await axiosInstance.get(url);
    const $ = cheerio.load(data);

    const jobElements = $(selectors.job);

    for (const el of jobElements.get()) {
      try {
        const elem = $(el);
        const title = elem.find(selectors.title).text().trim();
        const jobUrlRelative = elem.find(selectors.url).attr('href');
        const jobUrl = new URL(jobUrlRelative, url).href; // Resolve relative URL
        const company = elem.find(selectors.company).text().trim();
        const location = elem.find(selectors.location).text().trim() || 'Belirtilmemiş';
        const publishDateText = elem.find(selectors.publishDate)?.text().trim();
        const publishDate = publishDateText ? new Date(publishDateText) : new Date();
        const jobType = selectors.jobType ? elem.find(selectors.jobType)?.text().trim() : keyword; // Use keyword as default jobType

        // Fetch description from detail page if selector is provided
        let description = '';
        if (selectors.detailUrl) { // Check if detail URL selector is provided
             await rateLimiter.wait(); // Wait before fetching detail page
             const detailUrlRelative = elem.find(selectors.detailUrl).attr('href');
             const detailUrl = new URL(detailUrlRelative, url).href;
             try {
                 const { data: detailData } = await axiosInstance.get(detailUrl);
                 const detail$ = cheerio.load(detailData);
                 description = detail$(selectors.description).text().trim();
             } catch (detailError) {
                 console.error(`Error fetching detail page for ${sourceName} job ${title}:`, detailError.message);
                 errors.push({ source: sourceName, message: `Failed to fetch detail for ${title}: ${detailError.message}` });
                 description = 'Açıklama alınamadı.'; // Provide a default description
             }
        } else if (selectors.description) { // Otherwise, try to get description from list item
            description = elem.find(selectors.description).text().trim();
        }

        const jobDetails = extractJobDetails(description);

        const jobData = {
          title,
          company,
          url: jobUrl,
          originalUrl: jobUrl, // Store original URL to check for duplicates
          source: sourceName.toLowerCase(),
          jobType,
          publishDate,
          location,
          description,
          ...jobDetails,
          keywords: keyword ? [keyword] : [], // Store the keyword used for scraping
        };

        // Anahtar kelime kontrolü (sadece genel scraping için, eğer zaten detaydan gelmiyorsa)
        if (!keyword || title.toLowerCase().includes(keyword.toLowerCase()) || description.toLowerCase().includes(keyword.toLowerCase())) {
             scrapedJobs.push(jobData);
        } else {
             console.log(`⏩ Skipped (keyword mismatch): ${jobData.company} — ${jobData.title}`);
        }

      } catch (error) {
        console.error(`Error processing ${sourceName} job:`, error);
        errors.push({ source: sourceName, message: `Error processing job: ${error.message}` });
      }
    }

    console.log(`[${sourceName}] Scraping completed. Scraped: ${scrapedJobs.length}, Errors: ${errors.length}`);
    return { scrapedJobs, errors };

  } catch (error) {
    const errResult = handleScrapingError(error, sourceName);
    errors.push({ source: sourceName, message: errResult.message });
    return { scrapedJobs, errors };
  }
};

// Central function to scrape jobs based on source and keyword
const scrapeJobs = async ({ source = 'all', keyword = '' }) => {
  console.log(`[Scrape Manager] Starting job scraping for source: ${source}, keyword: ${keyword}`);
  let allScrapedJobs = [];
  let allErrors = [];

  const sources = {
    kariyernet: {
      url: 'https://www.kariyer.net/duyurular',
      selectors: {
        job: '.announcement-list .announcement-item',
        title: '.announcement-title',
        url: 'a',
        detailUrl: 'a', // Link on list item goes to detail page
        company: '.company-name',
        location: '.location',
        publishDate: '.announcement-date',
        description: '.announcement-content', // Description on detail page
        // jobType: not directly available in list item
      },
    },
    linkedin: {
      url: `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=World&f_TPR=r86400&redirect=false&position=1&pageNum=0`, // Search URL
       selectors: {
        job: '.jobs-search__results-list .job-card-container',
        title: '.base-search-card__title',
        url: 'a.base-card__full-link', // URL is on an anchor with this class
         detailUrl: 'a.base-card__full-link', // Detail URL is the same link
        company: '.base-search-card__subtitle a',
        location: '.job-search-card__location',
        publishDate: '.job-search-card__listdate, .job-search-card__listdate--writtenout',
        description: '.description__text--rich', // Description on detail page
        // jobType: not directly available in list item
      },
    },
    // Add other sources here
  };

  if (source === 'all' || source === 'kariyernet') {
    const { scrapedJobs, errors } = await genericScrape(
      sources.kariyernet.url,
      'Kariyer.net',
      sources.kariyernet.selectors,
      keyword
    );
    allScrapedJobs = [...allScrapedJobs, ...scrapedJobs];
    allErrors = [...allErrors, ...errors];
  }

  if (source === 'all' || source === 'linkedin') {
     // For LinkedIn, use the search URL built with the keyword
    const linkedinUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=World&f_TPR=r86400&redirect=false&position=1&pageNum=0`;
    const { scrapedJobs, errors } = await genericScrape(
      linkedinUrl,
      'LinkedIn',
      sources.linkedin.selectors,
      keyword
    );
    allScrapedJobs = [...allScrapedJobs, ...scrapedJobs];
    allErrors = [...allErrors, ...errors];
  }

  // After scraping, save all collected jobs
  const savedResults = [];
  for (const jobData of allScrapedJobs) {
      const saveResult = await saveJob(jobData);
      savedResults.push(saveResult);
       if (saveResult.status === 'error') {
           allErrors.push({ source: jobData.source, message: `Save failed for ${jobData.title}: ${saveResult.error}` });
       }
  }

  // Return combined results and errors
  return { scrapedJobs: allScrapedJobs, savedResults, errors: allErrors };
};

// Export the central function
module.exports = {
  scrapeJobs,
};
    