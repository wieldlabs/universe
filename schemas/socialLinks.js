const mongoose = require("mongoose"), schema = mongoose.Schema({
  discord: {
    type: String
  },
  medium: {
    type: String
  },
  telegram: {
    type: String
  },
  twitter: {
    type: String
  },
  instagram: {
    type: String
  },
  website: {
    type: String
  }
});

module.exports = {
  schema: schema
};