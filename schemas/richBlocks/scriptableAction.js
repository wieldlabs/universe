const mongoose = require("mongoose"), schema = mongoose.Schema({
  title: {
    type: String,
    required: !0,
    default: "New Script"
  },
  originalScriptUrl: {
    type: String
  },
  scriptUrl: {
    type: String
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};