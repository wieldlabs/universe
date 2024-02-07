const mongoose = require("mongoose"), schema = mongoose.Schema({
  key: {
    type: String,
    required: !0,
    index: !0
  },
  value: {
    type: String
  }
});

module.exports = {
  schema: schema
};