const mongoose = require("mongoose"), schema = require("../schemas/signedKeyRequest")["schema"];

class SignedKeyRequestClass {
  static ping() {
    console.log("model: SignedKeyRequestClass");
  }
}

schema.loadClass(SignedKeyRequestClass);

const SignedKeyRequest = mongoose.models.SignedKeyRequest || mongoose.model("SignedKeyRequest", schema);

module.exports = {
  SignedKeyRequest: SignedKeyRequest
};