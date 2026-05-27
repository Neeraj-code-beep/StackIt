const Question = require('../models/Question')

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function findSimilarQuestions(embedding, { limit = 10, threshold = 0.5, excludeId = null } = {}) {
  if (!embedding) return []

  const query = { isDeleted: false, embedding: { $exists: true, $ne: null } }
  if (excludeId) {
    query._id = { $ne: excludeId }
  }

  const questions = await Question.find(query)
    .select('title tags author viewCount answerCount createdAt voteCount')
    .populate('author', 'username reputation avatar')
    .lean()
    .limit(200)

  const scored = questions
    .map(q => ({
      _id: q._id,
      title: q.title,
      tags: q.tags,
      author: q.author,
      viewCount: q.viewCount,
      answerCount: q.answerCount,
      createdAt: q.createdAt,
      voteCount: (q.votes?.upvotes?.length || 0) - (q.votes?.downvotes?.length || 0),
      similarity: cosineSimilarity(embedding, q.embedding)
    }))
    .filter(q => q.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return scored
}

async function findDuplicates(embedding, threshold = 0.85) {
  if (!embedding) return []

  const questions = await Question.find({
    isDeleted: false,
    embedding: { $exists: true, $ne: null }
  })
    .select('title')
    .lean()
    .limit(100)

  const scored = questions
    .map(q => ({
      _id: q._id,
      title: q.title,
      similarity: cosineSimilarity(embedding, q.embedding)
    }))
    .filter(q => q.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)

  return scored
}

async function hybridSearch(queryText, embedding, { limit = 10, tags = '', status = 'all', timeRange = 'all' } = {}) {
  const textQuery = { isDeleted: false }
  if (queryText) {
    textQuery.$text = { $search: queryText }
  }
  if (tags) {
    const tagArray = tags.split(',').filter(t => t.trim())
    if (tagArray.length > 0) {
      textQuery.tags = { $in: tagArray }
    }
  }
  if (status === 'unanswered') {
    textQuery.answerCount = 0
  } else if (status === 'answered') {
    textQuery.answerCount = { $gt: 0 }
  } else if (status === 'accepted') {
    textQuery.acceptedAnswer = { $exists: true, $ne: null }
  }
  if (timeRange !== 'all') {
    const now = new Date()
    let startDate
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }
    if (startDate) {
      textQuery.createdAt = { $gte: startDate }
    }
  }

  const textResults = queryText
    ? await Question.find(textQuery)
        .select('title tags author viewCount answerCount createdAt content')
        .populate('author', 'username reputation avatar')
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean()
    : await Question.find(textQuery)
        .select('title tags author viewCount answerCount createdAt content')
        .populate('author', 'username reputation avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()

  if (!embedding || textResults.length === 0) {
    return textResults.map(q => ({
      ...q,
      voteCount: (q.votes?.upvotes?.length || 0) - (q.votes?.downvotes?.length || 0),
      textScore: 1,
      semanticScore: 0,
      hybridScore: 0.5
    }))
  }

  const BM25_WEIGHT = 0.3
  const SEMANTIC_WEIGHT = 0.7

  const scored = textResults.map((q, index) => {
    const textScore = textResults.length > 0 ? 1 - (index / textResults.length) : 0
    const semanticScore = q.embedding ? cosineSimilarity(embedding, q.embedding) : 0
    const hybridScore = BM25_WEIGHT * textScore + SEMANTIC_WEIGHT * semanticScore

    return {
      ...q,
      voteCount: (q.votes?.upvotes?.length || 0) - (q.votes?.downvotes?.length || 0),
      textScore,
      semanticScore,
      hybridScore
    }
  })

  scored.sort((a, b) => b.hybridScore - a.hybridScore)
  return scored.slice(0, limit)
}

module.exports = {
  cosineSimilarity,
  findSimilarQuestions,
  findDuplicates,
  hybridSearch
}
