const mongoose = require("mongoose"), schema = require("../schemas/metadata")["schema"];

class MetadataClass {}

schema.loadClass(MetadataClass);

const Metadata = mongoose.models.Metadata || mongoose.model("Metadata", schema);

module.exports = {
  Metadata: Metadata
};