require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'stackit-super-secret-jwt-key-2024-change-in-production'
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stackit'
}

const connectDB = require('../config/db')
const Question = require('../models/Question')
const { generateEmbedding, loadModel } = require('../services/embeddingService')

const BATCH_SIZE = 10

async function embedExistingQuestions() {
  try {
    await connectDB()
    console.log('Connected to MongoDB')

    await loadModel()
    console.log('Embedding model loaded')

    const total = await Question.countDocuments({
      isDeleted: false,
      $or: [{ embedding: null }, { embedding: { $exists: false } }]
    })

    console.log(`Found ${total} questions without embeddings`)

    if (total === 0) {
      console.log('All questions already have embeddings')
      process.exit(0)
    }

    let processed = 0

    while (processed < total) {
      const questions = await Question.find({
        isDeleted: false,
        $or: [{ embedding: null }, { embedding: { $exists: false } }]
      })
        .limit(BATCH_SIZE)
        .lean()

      if (questions.length === 0) break

      const texts = questions.map(q => {
        const plainText = (q.content || '').replace(/<[^>]*>/g, '')
        return `${q.title} ${plainText}`.slice(0, 1000)
      })

      const embeddings = await generateEmbedding(texts)

      if (!embeddings) {
        console.error('Failed to generate embeddings batch')
        break
      }

      const updates = questions.map((q, i) => ({
        updateOne: {
          filter: { _id: q._id },
          update: { $set: { embedding: embeddings[i] } }
        }
      }))

      await Question.bulkWrite(updates)
      processed += questions.length
      console.log(`Processed ${processed}/${total} questions`)
    }

    console.log('Done embedding existing questions')
    process.exit(0)
  } catch (error) {
    console.error('Error embedding questions:', error)
    process.exit(1)
  }
}

embedExistingQuestions()
