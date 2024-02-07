const mongoose = require("mongoose"), schema = mongoose.Schema({
  raw: {
    type: String
  },
  json: {
    type: String
  },
  html: {
    type: String
  }
});

schema.index({
  raw: "text"
}), module.exports = {
  schema: schema
};