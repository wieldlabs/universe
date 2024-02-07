const mongoose = require("mongoose"), schema = mongoose.Schema({
  domain: {
    type: String,
    required: !0,
    index: !0
  },
  uri: {
    type: String,
    required: !0
  }
});

schema.index({
  uri: 1
}), module.exports = {
  schema: schema
};