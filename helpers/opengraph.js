const axios = require("axios"), cheerio = require("cheerio"), {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), MAX_HTML_TIMEOUT = 5e3, MAX_HTML_CONTENT_LENGTH = 5242880, extractOpenGraphData = t => {
  try {
    const i = cheerio.load(t), c = {};
    return i("meta").each((t, e) => {
      var a = i(e).attr("property"), r = i(e).attr("content"), a = ("og:url" === a && (c.url = r), 
      "og:image" === a && (c.image = r), "twitter:image" === a && (c.image ||= r), 
      "og:title" === a && (c.title = r), "og:description" === a && (c.description = r), 
      "og:domain" === a && (c.domain = r), a || i(e).attr("name"));
      a?.includes("fc:frame") && (c[a] = r);
    }), c;
  } catch (t) {
    throw new Error("Error extracting OpenGraph data with cheerio: " + t);
  }
}, extractTwitterData = t => {
  try {
    var e = cheerio.load(t), a = {}, r = e(".twitter-tweet p").text(), i = (r && (a.description = r), 
    e(".twitter-tweet a:last-child").attr("href"));
    i && (a.url = i);
    var c, o = e(".twitter-tweet").text().match(/@(\w+)/);
    return o && (c = o[1], a.title = `@${c}'s post`), a.title || (a.title = e(".twitter-tweet a:last-child").text() || "X"), 
    a.image = "https://far.quest/x.png", a.logo = "https://far.quest/x.png", a.domain = "x.com", 
    a;
  } catch (t) {
    throw new Error("Error extracting X data with cheerio: " + t);
  }
};

async function fetchAndCacheOpenGraphData(t, e) {
  var a = getMemcachedClient(), e = (t.includes("twitter.com") || t.includes("x.com") ? extractTwitterData : extractOpenGraphData)(e);
  try {
    await a.set(getHash("getHtml:ogData:" + t), JSON.stringify(e), {
      lifetime: 86400
    });
  } catch (t) {
    console.error(t);
  }
  return e;
}

const getHtml = async e => {
  var t, a, r, i = getMemcachedClient();
  try {
    var c = await i.get(getHash("getHtml:ogData:" + e));
    if (c) return JSON.parse(c.value);
  } catch (t) {
    console.error(t);
  }
  let o;
  try {
    o = e.includes("twitter.com") || e.includes("x.com") ? (t = (await axios.get("https://publish.x.com/oembed?url=" + e.replace("twitter.com", "x.com"), {
      timeout: MAX_HTML_TIMEOUT,
      maxContentLength: MAX_HTML_CONTENT_LENGTH
    }))["data"], t.html) : (a = e.startsWith("http") ? e : "http://" + e, r = (await axios.get(a, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        DNT: "1"
      },
      timeout: MAX_HTML_TIMEOUT,
      maxContentLength: MAX_HTML_CONTENT_LENGTH
    }))["data"], r);
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
  return await fetchAndCacheOpenGraphData(e, o);
};

module.exports = {
  getHtml: getHtml,
  fetchAndCacheOpenGraphData: fetchAndCacheOpenGraphData
};