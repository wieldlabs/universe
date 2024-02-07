const mongoose = require("mongoose"), schema = mongoose.Schema({
  zIndex: {
    type: Number
  },
  src: {
    type: String
  }
});

module.exports = {
  schema: schema
};