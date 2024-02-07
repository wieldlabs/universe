const mongoose = require("mongoose"), schema = require("../schemas/richBlocks/richEmbed")["schema"];

class RichEmbedClass {
  static ping() {
    console.log("model: RichEmbedClass");
  }
}

schema.loadClass(RichEmbedClass);

const RichEmbed = mongoose.models.RichEmbed || mongoose.model("RichEmbed", schema);

module.exports = {
  RichEmbed: RichEmbed
};