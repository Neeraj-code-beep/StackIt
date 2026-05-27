const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 150
  },
  content: {
    type: String,
    required: true,
    minlength: 20
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  votes: {
    upvotes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    downvotes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  viewCount: {
    type: Number,
    default: 0
  },
  answerCount: {
    type: Number,
    default: 0
  },
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  closedReason: String,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: Date,
  bounty: {
    amount: {
      type: Number,
      default: 0
    },
    expiresAt: Date,
    awardedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    editedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  flags: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'duplicate', 'offensive', 'other']
    },
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  embedding: {
    type: [Number],
    default: null
  },
  isDuplicate: {
    type: Boolean,
    default: false
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  },
  duplicateFlags: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    score: {
      type: Number,
      min: 0,
      max: 1
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
})

// Indexes
questionSchema.index({ title: 'text', content: 'text' })
questionSchema.index({ author: 1, createdAt: -1 })
questionSchema.index({ tags: 1 })
questionSchema.index({ createdAt: -1 })
questionSchema.index({ 'votes.upvotes': -1 })
questionSchema.index({ answerCount: -1 })
questionSchema.index({ viewCount: -1 })

// Virtual for vote count
questionSchema.virtual('voteCount').get(function() {
  return this.votes.upvotes.length - this.votes.downvotes.length
})

// Virtual for total votes
questionSchema.virtual('totalVotes').get(function() {
  return this.votes.upvotes.length + this.votes.downvotes.length
})

// Virtual for isAnswered
questionSchema.virtual('isAnswered').get(function() {
  return this.answerCount > 0
})

// Virtual for isAccepted
questionSchema.virtual('isAccepted').get(function() {
  return !!this.acceptedAnswer
})

// Methods
questionSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1
  return this.save()
}

questionSchema.methods.addVote = async function(userId, voteType) {
  const userVoteIndex = this.votes.upvotes.findIndex(vote => vote.user.toString() === userId.toString())
  const userDownvoteIndex = this.votes.downvotes.findIndex(vote => vote.user.toString() === userId.toString())

  // Remove existing vote
  if (userVoteIndex > -1) {
    this.votes.upvotes.splice(userVoteIndex, 1)
  }
  if (userDownvoteIndex > -1) {
    this.votes.downvotes.splice(userDownvoteIndex, 1)
  }

  // Add new vote
  if (voteType === 'upvote') {
    this.votes.upvotes.push({ user: userId })
  } else if (voteType === 'downvote') {
    this.votes.downvotes.push({ user: userId })
  }

  return this.save()
}

questionSchema.methods.removeVote = async function(userId) {
  this.votes.upvotes = this.votes.upvotes.filter(vote => vote.user.toString() !== userId.toString())
  this.votes.downvotes = this.votes.downvotes.filter(vote => vote.user.toString() !== userId.toString())
  return this.save()
}

questionSchema.methods.acceptAnswer = async function(answerId) {
  this.acceptedAnswer = answerId
  return this.save()
}

questionSchema.methods.close = async function(reason, closedBy) {
  this.isClosed = true
  this.closedReason = reason
  this.closedBy = closedBy
  this.closedAt = new Date()
  return this.save()
}

questionSchema.methods.reopen = async function() {
  this.isClosed = false
  this.closedReason = null
  this.closedBy = null
  this.closedAt = null
  return this.save()
}

questionSchema.methods.softDelete = async function(deletedBy) {
  this.isDeleted = true
  this.deletedAt = new Date()
  this.deletedBy = deletedBy
  return this.save()
}

// Pre-save middleware to update answer count
questionSchema.pre('save', function(next) {
  if (this.isModified('acceptedAnswer')) {
    // Update answer count when accepting an answer
    this.answerCount = this.answerCount || 0
  }
  next()
})

// JSON serialization
questionSchema.methods.toJSON = function() {
  const question = this.toObject()
  delete question.embedding
  question.voteCount = this.voteCount
  question.totalVotes = this.totalVotes
  question.isAnswered = this.isAnswered
  question.isAccepted = this.isAccepted
  return question
}

module.exports = mongoose.model('Question', questionSchema) 