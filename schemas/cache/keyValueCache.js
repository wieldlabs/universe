const mongoose = require("mongoose"), schema = mongoose.Schema({
  key: {
    type: String,
    required: !0,
    index: !0
  },
  value: {
    type: String
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 3e5)
  }
}, {
  timestamps: !0
});

schema.index({
  createdAt: 1
}), schema.index({
  key: 1,
  createdAt: -1
}), module.exports = {
  schema: schema
};