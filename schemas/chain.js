const mongoose = require("mongoose"), schema = mongoose.Schema({
  chainId: {
    type: Number
  },
  name: {
    type: String
  }
});

module.exports = {
  schema: schema
};