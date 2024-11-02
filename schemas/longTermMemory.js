const mongoose = require("mongoose"), schema = mongoose.Schema({
  content: {
    type: String,
    required: !0
  },
  embedding: {
    type: [ Number ],
    required: !0
  },
  significanceScore: {
    type: Number,
    required: !0
  },
  cast: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cast"
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};