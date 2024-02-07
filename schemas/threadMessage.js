const mongoose = require("mongoose"), richContentSchema = require("./richContent")["schema"], schema = mongoose.Schema({
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Thread",
    index: !0
  },
  richContent: richContentSchema,
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  }
}, {
  timestamps: !0
});

schema.index({
  createdAt: -1
}), schema.index({
  updatedAt: -1
}), module.exports = {
  schema: schema
};