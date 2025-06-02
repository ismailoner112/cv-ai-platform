const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const { scrapeJobs } = require('../scrape/scraper'); // Import the consolidated scrapeJobs function
const Announcement = require('../models/Announcement'); // Import Announcement model

// İş ilanlarını çekme ve kaydetme rotası (Admin yetkisi gerekli)
// POST /api/jobs/scrape
// Body: { source: 'kariyer' | 'linkedin' | 'all', keyword?: string }
router.post('/scrape', auth, isAdmin, async (req, res) => {
  const { source, keyword = '' } = req.body; // Default keyword to empty string

  if (!source || !['kariyer', 'linkedin', 'all'].includes(source)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Geçerli bir kaynak belirtmelisiniz (kariyer, linkedin veya all).' 
    });
  }

  try {
    console.log(`${source} kaynağından iş ilanları çekiliyor... Anahtar kelime: ${keyword}`);

    // Use the consolidated scrapeJobs function
    const results = await scrapeJobs({ source, keyword });
    const scrapedJobs = results.scrapedJobs; // Assuming scrapeJobs returns { scrapedJobs: [], errors: [] }

    console.log(`Çekilen ${scrapedJobs.length} iş ilanı var. Hata sayısı: ${results.errors.length}`); // Log error count

    const savedJobs = [];
    for (const jobData of scrapedJobs) {
        // Check if announcement with the same source and originalUrl already exists
        const existingAnn = await Announcement.findOne({
            source: jobData.source || source, // Use jobData.source if available, otherwise use the source from request
            originalUrl: jobData.originalUrl
        });

        if (existingAnn) {
            // Update existing announcement
            // Note: Be careful about what fields to update. Avoid overwriting manual changes.
            // For now, let's just ensure basic fields match and update last scraped date/keyword/source
            existingAnn.title = jobData.title || existingAnn.title;
            existingAnn.company = jobData.company || existingAnn.company;
            existingAnn.location = jobData.location || existingAnn.location;
            existingAnn.publishDate = jobData.publishDate || existingAnn.publishDate; // Keep existing if scraper didn't provide
            existingAnn.jobType = jobData.jobType || existingAnn.jobType;
            existingAnn.salary = jobData.salary || existingAnn.salary;
            existingAnn.experience = jobData.experience || existingAnn.experience;
            existingAnn.education = jobData.education || existingAnn.education;
            existingAnn.skills = jobData.skills && jobData.skills.length > 0 ? existingAnn.skills : existingAnn.skills; // Only add new skills, don't replace
            existingAnn.benefits = jobData.benefits && jobData.benefits.length > 0 ? existingAnn.benefits : existingAnn.benefits; // Only add new benefits, don't replace
            existingAnn.description = jobData.description || existingAnn.description; // Update description
            existingAnn.lastScrapedAt = new Date(); // Update last scraped timestamp
            // Update source and keyword to reflect the latest scrape that included this job
            existingAnn.source = jobData.source || source; // Ensure source is correctly set
            // Add keyword to a list if multiple keywords can find the same job
            if (!existingAnn.keywords.includes(keyword)) {
                existingAnn.keywords.push(keyword);
            }

            await existingAnn.save();
            savedJobs.push({ id: existingAnn._id, status: 'updated' });

        } else {
            // Create new announcement
            const newAnn = new Announcement({
                title: jobData.title,
                company: jobData.company,
                location: jobData.location,
                originalUrl: jobData.originalUrl,
                publishDate: jobData.publishDate || new Date(), // Use scraped date if available, otherwise current date
                source: jobData.source || source, // Use jobData.source if available, otherwise use the source from request
                jobType: jobData.jobType,
                salary: jobData.salary,
                experience: jobData.experience,
                education: jobData.education,
                skills: jobData.skills || [], // Ensure skills is an array
                benefits: jobData.benefits || [], // Ensure benefits is an array
                description: jobData.description,
                isPublished: true, // Scraped jobs are published by default?
                slug: jobData.slug || `job-${Date.now()}`, // Generate a basic slug if not provided
                scraped: true, // Mark as scraped
                lastScrapedAt: new Date(),
                keywords: keyword ? [keyword] : [], // Store the keyword used for scraping, ensure it's an array
                // Other fields like createdAt will be set automatically
            });
            await newAnn.save();
            savedJobs.push({ id: newAnn._id, status: 'created' });
        }
    }

    const response = {
      success: true,
      message: `${source} kaynağından ${savedJobs.length} iş ilanı çekildi ve veritabanına kaydedildi/güncellendi.`, // Updated message
      savedJobsCount: savedJobs.length, // Added count of saved/updated jobs
       errors: results.errors // Include errors from scraper
    };

    // Add a warning message if there were scraping errors
    if (results.errors.length > 0) {
        response.message += ` (${results.errors.length} hata oluştu.)`;
    }

    res.json(response);

  } catch (error) {
    console.error(`${source} kaynağından iş ilanı çekme ve kaydetme hatası:`, error);
    res.status(500).json({ 
      success: false, 
      message: `${source} kaynağından iş ilanları çekilirken veya kaydedilirken bir hata oluştu.`,
      error: error.message 
    });
  }
});

module.exports = router; 