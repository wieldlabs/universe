const mongoose = require("mongoose"), schema = mongoose.Schema({
  score: {
    type: String
  },
  address: {
    type: String,
    index: !0
  },
  scoreType: {
    type: String,
    index: !0
  }
}, {
  timestamps: !0
});

schema.index({
  address: 1,
  scoreType: 1
}), schema.index({
  scoreType: 1,
  score: 1
}), module.exports = {
  schema: schema
};