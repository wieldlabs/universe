const mongoose = require("../../connectdb")["mongoose"], combinationSchema = new mongoose.Schema({
  element1: {
    type: String,
    required: !0
  },
  element2: {
    type: String,
    required: !0
  },
  result: {
    type: String,
    required: !0
  },
  discoveredBy: {
    type: String
  }
}, {
  timestamps: !0
}), elementSchema = (combinationSchema.index({
  element1: 1,
  element2: 1
}, {
  unique: !0
}), new mongoose.Schema({
  name: {
    type: String,
    required: !0,
    unique: !0,
    lowercase: !0,
    trim: !0
  },
  emoji: {
    type: String,
    required: !0
  },
  discoveredBy: {
    type: String
  },
  description: {
    type: String,
    default: ""
  },
  properties: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  depth: {
    type: Number,
    default: 0
  }
}, {
  timestamps: !0,
  indexes: [ {
    name: 1
  }, {
    discoveredBy: 1
  } ]
})), metadataSchema = (elementSchema.index({
  discoveredBy: 1
}), new mongoose.Schema({
  imageUrl: {
    type: String
  },
  ipfsHash: {
    type: String
  },
  elements: {
    type: [ String ]
  },
  tokenId: {
    type: Number
  }
}));

module.exports = {
  elementSchema: elementSchema,
  combinationSchema: combinationSchema,
  metadataSchema: metadataSchema
};