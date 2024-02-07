const mongoose = require("mongoose"), schema = mongoose.Schema({
  url: {
    type: String,
    index: !0
  },
  image: {
    type: String
  },
  title: {
    type: String
  },
  description: {
    type: String
  },
  logo: {
    type: String
  },
  iframe: {
    type: String
  }
});

module.exports = {
  schema: schema
};