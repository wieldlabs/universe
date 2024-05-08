const mongoose = require("mongoose"), axios = require("axios").default, FormData = require("form-data"), fs = require("fs"), schema = require("../schemas/richBlocks/image")["schema"], Sentry = require("@sentry/node");

let fileType;

import("file-type").then(e => {
  fileType = e;
}).catch(e => console.error("Failed to load file-type module", e));

class ImageClass {
  static ping() {
    console.log("model: ImageClass");
  }
  static async uploadImage({
    image: e
  }) {
    try {
      var a = new FormData();
      if (Buffer.isBuffer(e)) {
        var r = await fileType.fileTypeFromBuffer(e);
        if (!r) throw new Error("Unable to determine file type");
        a.append("file", e, {
          filename: "image." + r.ext,
          contentType: r.mime
        });
      } else if (e instanceof String || "string" == typeof e) if (e.startsWith("data:image")) {
        var o = e.match(/^data:(.+);base64,(.*)$/);
        if (3 !== o.length) throw new Error("Invalid base64 data");
        var s = o[1], t = o[2], n = Buffer.from(t, "base64"), i = new Blob([ n ], {
          type: s
        });
        a.append("file", i);
      } else a.append("file", e); else a.append("file", e, e.name);
      var l = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`, a, {
        headers: {
          Authorization: "Bearer " + process.env.CLOUDFLARE_API_KEY
        }
      });
      if (l?.data?.success) return l.data;
      throw new Error("Cloudflare API error");
    } catch (e) {
      throw e.response ? (console.error(e.response.data), new Error(e.response.data.message || e.message)) : (console.error(e), 
      new Error(e.message));
    }
  }
  static async uploadImageFromUrl({
    url: e
  }) {
    try {
      var a = new FormData(), r = (a.append("file", e), console.log(a), await axios.post(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`, a, {
        headers: {
          Authorization: "Bearer " + process.env.CLOUDFLARE_API_KEY
        }
      }));
      if (r?.data?.success) return r.data;
      throw new Error("Cloudflare API error");
    } catch (e) {
      throw e.response ? (console.error(e.response.data), new Error(e.response.data.message || e.message)) : (console.error(e), 
      new Error(e.message));
    }
  }
}

schema.loadClass(ImageClass);

const Image = mongoose.models.Image || mongoose.model("Image", schema);

module.exports = {
  Image: Image
};