const mongoose = require("mongoose"), schema = mongoose.Schema({
  chatType: {
    type: String,
    required: !0
  },
  uniqueIdentifier: {
    type: String
  },
  extraData: {
    type: Object
  },
  lastMessagedAt: {
    type: Date
  }
}, {
  timestamps: !0
});

schema.index({
  chatType: 1,
  uniqueIdentifier: 1
}), schema.index({
  chatType: 1
}), module.exports = {
  schema: schema
};