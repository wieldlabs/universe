const mongoose = require("mongoose"), schema = mongoose.Schema({
  type: {
    type: String,
    index: !0,
    enum: [ "ACTIONS" ]
  },
  object: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0
  }
});

schema.index({
  type: 1,
  object: 1,
  account: 1
}), module.exports = {
  schema: schema
};