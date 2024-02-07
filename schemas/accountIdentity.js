const mongoose = require("mongoose"), schema = mongoose.Schema({
  farcaster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Farcaster"
  }
});

module.exports = {
  schema: schema
};