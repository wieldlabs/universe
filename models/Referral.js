const mongoose = require("mongoose"), schema = require("../schemas/referral")["schema"];

class ReferralClass {
  static ping() {
    console.log("model: ReferralClass");
  }
}

schema.loadClass(ReferralClass);

const Referral = mongoose.models.Referral || mongoose.model("Referral", schema);

module.exports = {
  Referral: Referral
};