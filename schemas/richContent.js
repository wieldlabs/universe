const mongoose = require("mongoose"), contentSchema = require("./content")["schema"], richContentBlock = require("./richContentBlock")["schema"], schema = mongoose.Schema({
  content: contentSchema,
  blocks: [ richContentBlock ]
});

module.exports = {
  schema: schema
};