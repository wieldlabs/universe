const mongoose = require("mongoose"), chainSchema = require("./chain")["schema"], schema = mongoose.Schema({
  address: {
    type: String,
    index: !0,
    required: !0
  },
  chain: chainSchema
});

module.exports = {
  schema: schema
};