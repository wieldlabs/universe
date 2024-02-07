const mongoose = require("mongoose"), schema = mongoose.Schema({
  x: {
    type: Number
  },
  y: {
    type: Number
  },
  z: {
    type: Number
  }
});

module.exports = {
  schema: schema
};