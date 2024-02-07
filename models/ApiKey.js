const mongoose = require("mongoose"), schema = require("../schemas/apiKey")["schema"];

class ApiKeyClass {
  static ping() {
    console.log("model: ApiKeyClass");
  }
}

schema.loadClass(ApiKeyClass);

const ApiKey = mongoose.models.ApiKey || mongoose.model("ApiKey", schema);

module.exports = {
  ApiKey: ApiKey
};