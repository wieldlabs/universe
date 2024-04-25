const axios = require("axios"), cheerio = require("cheerio"), {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), MAX_HTML_TIMEOUT = 5e3, MAX_HTML_CONTENT_LENGTH = 5242880, getHtml = async e => {
  var t, r, a, i = getMemcachedClient();
  try {
    var o = await i.get(getHash("getHtml:ogData:" + e));
    if (o) return JSON.parse(o.value);
  } catch (t) {
    console.error(t);
  }
  let c;
  try {
    c = e.includes("twitter.com") || e.includes("x.com") ? (t = (await axios.get("https://publish.twitter.com/oembed?url=" + e.replace("x.com", "twitter.com"), {
      timeout: MAX_HTML_TIMEOUT,
      maxContentLength: MAX_HTML_CONTENT_LENGTH
    }))["data"], t.html) : (r = e.startsWith("http") ? e : "http://" + e, a = (await axios.get(r, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        DNT: "1"
      },
      timeout: MAX_HTML_TIMEOUT,
      maxContentLength: MAX_HTML_CONTENT_LENGTH
    }))["data"], a);
  } catch (t) {
    console.error("caching getHTML error to prevent server overload");
    try {
      await i.set(getHash("getHtml:ogData:" + e), JSON.stringify({
        getHtmlError: "Error fetching HTML"
      }), {
        lifetime: 3600
      });
    } catch (t) {
      console.error(t);
    }
    throw t;
  }
  o = (e.includes("twitter.com") ? extractTwitterData : extractOpenGraphData)(c);
  try {
    await i.set(getHash("getHtml:ogData:" + e), JSON.stringify(o), {
      lifetime: 86400
    });
  } catch (t) {
    console.error(t);
  }
  return o;
}, extractOpenGraphData = t => {
  try {
    const i = cheerio.load(t), o = {};
    return i("meta").each((t, e) => {
      var r = i(e).attr("property"), a = i(e).attr("content"), r = ("og:url" === r && (o.url = a), 
      "og:image" === r && (o.image = a), "og:title" === r && (o.title = a), "og:description" === r && (o.description = a), 
      "og:domain" === r && (o.domain = a), r || i(e).attr("name"));
      r?.includes("fc:frame") && (o[r] = a);
    }), o;
  } catch (t) {
    throw new Error("Error extracting OpenGraph data with cheerio: " + t);
  }
}, extractTwitterData = t => {
  try {
    var e = cheerio.load(t), r = {}, a = e(".twitter-tweet p").text(), i = (a && (r.description = a), 
    e(".twitter-tweet a:last-child").attr("href"));
    i && (r.url = i);
    var o, c = e(".twitter-tweet").text().match(/@(\w+)/);
    return c && (o = c[1], r.title = `@${o}'s tweet`), r.title || (r.title = e(".twitter-tweet a:last-child").text() || "Twitter"), 
    r.image = "/twitter.png", r.logo = "/twitter.png", r.domain = "twitter.com", 
    r;
  } catch (t) {
    throw new Error("Error extracting Twitter data with cheerio: " + t);
  }
};

module.exports = {
  getHtml: getHtml
};