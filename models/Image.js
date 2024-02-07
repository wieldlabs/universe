const mongoose = require("mongoose"), axios = require("axios").default, FormData = require("form-data"), fs = require("fs"), schema = require("../schemas/richBlocks/image")["schema"], Sentry = require("@sentry/node");

class ImageClass {
  static ping() {
    console.log("model: ImageClass");
  }
  static async uploadImage({
    image: e
  }) {
    try {
      var a = new FormData(), s = (e instanceof String || "string" == typeof e ? a.append("image", e) : (a.append("image", fs.createReadStream(e.filepath)), 
      a.append("type", "file"), a.append("name", e.newFilename)), await axios.post("https://api.imgur.com/3/image", a, {
        headers: {
          ...a.getHeaders(),
          Authorization: "Client-ID " + process.env.IMGUR_CLIENT_ID
        }
      }));
      if (s?.data?.success) {
        const e = await Image.create({
          src: s.data.data.link,
          name: s.data.data.name,
          isVerified: !1
        });
        return e;
      }
      throw new Error("Imgur API error");
    } catch (e) {
      throw Sentry.captureException(e), console.error(e), new Error(e.message);
    }
  }
}

schema.loadClass(ImageClass);

const Image = mongoose.models.Image || mongoose.model("Image", schema);

module.exports = {
  Image: Image
};