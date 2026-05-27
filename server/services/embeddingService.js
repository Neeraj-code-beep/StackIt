let model = null
let modelLoading = false
let modelLoadPromise = null

const MAX_INPUT_LENGTH = 512

function truncateText(text) {
  const words = text.split(/\s+/)
  if (words.length <= MAX_INPUT_LENGTH) return text
  return words.slice(0, MAX_INPUT_LENGTH).join(' ')
}

async function loadModel() {
  if (model) return model
  if (modelLoading) return modelLoadPromise

  modelLoading = true
  modelLoadPromise = (async () => {
    try {
      const use = await import('@tensorflow-models/universal-sentence-encoder')
      model = await use.load()
      console.log('Universal Sentence Encoder model loaded')
      return model
    } catch (error) {
      console.error('Failed to load USE model:', error.message)
      return null
    } finally {
      modelLoading = false
    }
  })()

  return modelLoadPromise
}

async function generateEmbedding(text) {
  const m = await loadModel()
  if (!m) return null

  const truncated = truncateText(text)
  const embeddings = await m.embed([truncated])
  const embedding = await embeddings.array()
  return embedding[0]
}

async function generateEmbeddings(texts) {
  const m = await loadModel()
  if (!m) return null

  const truncated = texts.map(t => truncateText(t))
  const embeddings = await m.embed(truncated)
  return await embeddings.array()
}

async function isModelReady() {
  const m = await loadModel()
  return m !== null
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  isModelReady,
  loadModel
}
