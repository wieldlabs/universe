const mongoose = require("mongoose"), contentSchema = require("../content")["schema"], keyValueFieldsSchema = require("../keyValueFields")["schema"], schema = mongoose.Schema({
  description: contentSchema,
  title: {
    type: String
  },
  timestamp: {
    type: Date
  },
  image: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Image"
  },
  thumbnail: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Image"
  },
  color: {
    type: String
  },
  url: {
    type: String
  },
  fields: [ keyValueFieldsSchema ]
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};