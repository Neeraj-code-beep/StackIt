const express = require('express')
const { generateEmbedding } = require('../services/embeddingService')
const { hybridSearch } = require('../services/vectorSearch')

const router = express.Router()

// @route   POST /api/search/semantic
// @desc    Hybrid semantic + text search
// @access  Public
router.post('/semantic', async (req, res) => {
  try {
    const { query, tags = '', status = 'all', timeRange = 'all', limit = 10 } = req.body

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' })
    }

    let embedding = null
    try {
      embedding = await generateEmbedding(query)
    } catch (err) {
      console.error('Embedding generation failed, falling back to text search:', err.message)
    }

    const results = await hybridSearch(query, embedding, { limit: parseInt(limit), tags, status, timeRange })

    res.json({ results, semantic: !!embedding })
  } catch (error) {
    console.error('Semantic search error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
