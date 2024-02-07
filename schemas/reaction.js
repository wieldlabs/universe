const mongoose = require("mongoose"), schema = mongoose.Schema({
  likes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};