const mongoose = require("mongoose"), schema = require("../../schemas/richContentBlock")["schema"];

class RichBlockClass {
  static ping() {
    console.log("model: RichBlockClass");
  }
}

schema.loadClass(RichBlockClass);

const RichBlock = mongoose.models.RichBlock || mongoose.model("RichBlock", schema);

module.exports = {
  RichBlock: RichBlock
};