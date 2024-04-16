const mongoose = require("mongoose"), axios = require("axios").default, axiosRetry = require("axios-retry").default, cleanIframeHtml = (axiosRetry(axios, {
  retries: 3
}), require("../helpers/html-sanitize-and-store"))["cleanIframeHtml"], schema = require("../schemas/richBlocks/link")["schema"], metascraper = require("metascraper")([ require("metascraper-description")(), require("metascraper-image")(), require("metascraper-logo")(), require("metascraper-title")(), require("metascraper-url")(), require("metascraper-iframe")() ]), Sentry = require("@sentry/node"), TIMEOUT = 1e4, imgurRegex = /https:\/\/i.imgur.com\/\w+(.(png|jpg|jpeg|gif))/;

class LinkClass {
  static ping() {
    console.log("model: LinkClass");
  }
  static async getHtml(e) {
    let a;
    var t;
    return a = e.includes("twitter.com") ? (t = (await axios.get("https://publish.twitter.com/oembed?url=" + e, {
      timeout: TIMEOUT
    }))["data"], t.html) : (t = (await axios.get(e, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
      },
      timeout: TIMEOUT
    }))["data"], t);
  }
  static async createRichLink({
    url: e,
    callback: a,
    onError: t
  }) {
    if (!e) return null;
    if (e.includes(".pdf")) return a?.(null) || null;
    if (e.includes(".dmg")) return a?.(null) || null;
    if (e.includes(".zip")) return a?.(null) || null;
    try {
      var r, i, s, l, n, c, o, m, u, p, d, g, h, f, x, w, k, q;
      return e.includes("farcaster://") ? (r = process.env.BEB_FARCASTER_APP_TOKEN, 
      s = "https://api.warpcast.com/v2/cast?hash=" + (i = e.split("farcaster://casts/")[1].split("/")[0]), 
      l = (await axios.get(s, {
        headers: {
          Authorization: "Bearer " + r,
          accept: "application/json"
        }
      }))["data"], c = `
        <div class="farcaster-embed">
        <div class="farcaster-embed__header">
          <div class="farcaster-embed__header__title">
            ${(n = l.result.cast).text}
          </div>
          <div class="farcaster-embed__header__author">
            <i>- ${n.author.username} on ${new Date(n.timestamp).toDateString()}</i>
          </div>
        </div>
        </div>
        `, m = (o = n.text.match(imgurRegex)) ? o[0] : null, u = new Link(), a?.(u), 
      u.iframe = c, u.image = m, u.url = `https://warpcast.com/${n.author.username}/` + i, 
      u.title = n.text, await u.save()) : (p = await LinkClass.getHtml(e), d = new Link(), 
      {
        description: g,
        image: h,
        title: f,
        logo: x,
        url: w,
        iframe: k
      } = (a?.(d), await metascraper({
        html: p,
        url: e
      })), q = k && -1 !== w?.indexOf("twitter") ? cleanIframeHtml(k) : null, d.url = w, 
      d.title = f, d.description = g, d.image = h, d.logo = x, d.iframe = q, await d.save());
    } catch (e) {
      return Sentry.captureException(e), console.error(e), t?.(e), null;
    }
  }
}

schema.loadClass(LinkClass);

const Link = mongoose.models.Link || mongoose.model("Link", schema);

module.exports = {
  Link: Link
};