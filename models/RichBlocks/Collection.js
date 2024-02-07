const mongoose = require("mongoose"), schema = require("../../schemas/richBlocks/collection")["schema"];

class CollectionClass {
  static ping() {
    console.log("model: CollectionClass");
  }
}

schema.loadClass(CollectionClass);

const Collection = mongoose.models.Collection || mongoose.model("Collection", schema);

module.exports = {
  Collection: Collection
};