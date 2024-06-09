const mongoose = require("mongoose"), axios = require("axios").default, axiosRetry = require("axios-retry").default, cleanIframeHtml = (axiosRetry(axios, {
  retries: 3
}), require("../helpers/html-sanitize-and-store"))["cleanIframeHtml"], schema = require("../schemas/richBlocks/link")["schema"], Sentry = require("@sentry/node"), TIMEOUT = 1e4, imgurRegex = /https:\/\/i.imgur.com\/\w+(.(png|jpg|jpeg|gif))/;

class LinkClass {
  static ping() {
    console.log("model: LinkClass");
  }
  static async getHtml(e) {
    let t;
    var a;
    return t = e.includes("twitter.com") || e.includes("x.com") ? (a = (await axios.get("https://publish.x.com/oembed?url=" + e, {
      timeout: TIMEOUT
    }))["data"], a.html) : (a = (await axios.get(e, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
      },
      timeout: TIMEOUT
    }))["data"], a);
  }
  static async createRichLink({}) {
    throw new Error("Not implemented");
  }
}

schema.loadClass(LinkClass);

const Link = mongoose.models.Link || mongoose.model("Link", schema);

module.exports = {
  Link: Link
};