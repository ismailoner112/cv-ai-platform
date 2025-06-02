const express = require('express')
const router  = express.Router()
const Visitor = require('../models/Visitor')
const { auth, isAdmin } = require('../middleware/auth');

/**
 * getVisitorStats(): toplam/unique ziyaret sayıları + sayfa bazlı istatistik
 */
async function getVisitorStats() {
  const now         = new Date()
  const last24Hours = new Date(now - 24 * 60 * 60 * 1000)
  const last7Days   = new Date(now -  7 * 24 * 60 * 60 * 1000)
  const last30Days  = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const [
    totalVisits,
    unique24,
    unique7d,
    unique30d,
    pageStats
  ] = await Promise.all([
    Visitor.countDocuments(),
    Visitor.countDocuments({ timestamp: { $gte: last24Hours }, isUnique: true }),
    Visitor.countDocuments({ timestamp: { $gte: last7Days   }, isUnique: true }),
    Visitor.countDocuments({ timestamp: { $gte: last30Days  }, isUnique: true }),
    Visitor.aggregate([
      { $group: {
          _id: '$page',
          visits:       { $sum: 1 },
          uniqueVisits: { $sum: { $cond: ['$isUnique', 1, 0] } }
        }
      },
      { $project: {
          page:         '$_id',
          visits:       1,
          uniqueVisits: 1,
          _id:          0
        }
      }
    ])
  ])

  return { totalVisits, unique24, unique7d, unique30d, pageStats }
}

// GET /api/visitors/stats
router.get('/stats', auth, isAdmin, async (req, res, next) => {
  try {
    const stats = await getVisitorStats()
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

module.exports = router
