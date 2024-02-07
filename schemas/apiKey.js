const mongoose = require("mongoose"), schema = mongoose.Schema({
  key: {
    type: String,
    required: !0,
    unique: !0
  },
  description: {
    type: String,
    required: !0
  },
  multiplier: {
    type: Number,
    required: !0
  },
  email: {
    type: String
  }
});

schema.index({
  key: 1
}), module.exports = {
  schema: schema
};