const schema = require("../schemas/webhook")["schema"], mongoose = require("mongoose");

class WebhookClass {
  static ping() {
    console.log("model: WebhookClass");
  }
}

schema.loadClass(WebhookClass);

const Webhook = mongoose.models.Webhook || mongoose.model("Webhook", schema);

module.exports = {
  Webhook: Webhook
};