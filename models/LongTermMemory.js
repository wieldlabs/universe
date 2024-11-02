const mongoose = require("mongoose"), schema = require("../schemas/longTermMemory")["schema"];

class LongTermMemoryClass {}

schema.loadClass(LongTermMemoryClass);

const LongTermMemory = mongoose.models.LongTermMemory || mongoose.model("LongTermMemory", schema);

module.exports = {
  LongTermMemory: LongTermMemory
};