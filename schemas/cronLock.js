const mongoose = require("mongoose"), schema = mongoose.Schema({
  name: {
    type: String
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};