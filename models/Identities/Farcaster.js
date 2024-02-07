const mongoose = require("mongoose"), schema = require("../../schemas/identities/farcaster")["schema"];

class FarcasterClass {
  static ping() {
    console.log("model: FarcasterClass");
  }
}

schema.loadClass(FarcasterClass);

const Farcaster = mongoose.models.Farcaster || mongoose.model("Farcaster", schema);

module.exports = {
  Farcaster: Farcaster
};