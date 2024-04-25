const mongoose = require("mongoose"), axios = require("axios").default, FormData = require("form-data"), fs = require("fs"), schema = require("../schemas/richBlocks/image")["schema"], Sentry = require("@sentry/node");

class ImageClass {
  static ping() {
    console.log("model: ImageClass");
  }
  static async uploadImage({
    image: e
  }) {
    try {
      var a = new FormData();
      if (e instanceof String || "string" == typeof e) if (e.startsWith("data:image")) {
        var s = e.match(/^data:(.+);base64,(.*)$/);
        if (3 !== s.length) throw new Error("Invalid base64 data");
        var r = s[1], o = s[2], t = Buffer.from(o, "base64"), i = new Blob([ t ], {
          type: r
        });
        a.append("file", i);
      } else a.append("file", e); else a.append("file", e, e.name);
      var n = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`, a, {
        headers: {
          Authorization: "Bearer " + process.env.CLOUDFLARE_API_KEY
        }
      });
      if (n?.data?.success) return await Image.create({
        src: n.data.result.variants[n.data.result.variants.length - 1],
        name: n.data.result.filename,
        isVerified: !1
      });
      throw new Error("Cloudflare API error");
    } catch (e) {
      throw console.error(e), new Error(e.message);
    }
  }
}

schema.loadClass(ImageClass);

const Image = mongoose.models.Image || mongoose.model("Image", schema);

module.exports = {
  Image: Image
};