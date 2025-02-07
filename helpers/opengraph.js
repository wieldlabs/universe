const axios = require("axios"), cheerio = require("cheerio"), {
  memcache,
  getHash
} = require("../connectmemcache"), MAX_HTML_TIMEOUT = 5e3, MAX_HTML_CONTENT_LENGTH = 5242880, extractOpenGraphData = t => {
  try {
    const i = cheerio.load(t), o = {};
    return i("meta").each((t, e) => {
      var a = i(e).attr("property"), r = i(e).attr("content"), a = ("og:url" === a && (o.url = r), 
      "og:image" === a && (o.image = r), "twitter:image" === a && (o.image ||= r), 
      "og:title" === a && (o.title = r), "og:description" === a && (o.description = r), 
      "og:domain" === a && (o.domain = r), a || i(e).attr("name"));
      a?.includes("fc:frame") && (o[a] = r);
    }), o;
  } catch (t) {
    throw new Error("Error extracting OpenGraph data with cheerio: " + t);
  }
}, extractTwitterData = t => {
  try {
    var e = cheerio.load(t), a = {}, r = e(".twitter-tweet p").text(), i = (r && (a.description = r), 
    e(".twitter-tweet a:last-child").attr("href"));
    i && (a.url = i);
    var o, c = e(".twitter-tweet").text().match(/@(\w+)/);
    return c && (o = c[1], a.title = `@${o}'s post`), a.title || (a.title = e(".twitter-tweet a:last-child").text() || "X"), 
    a.image = "https://far.quest/x.png", a.logo = "https://far.quest/x.png", a.domain = "x.com", 
    a;
  } catch (t) {
    throw new Error("Error extracting X data with cheerio: " + t);
  }
};

async function fetchAndCacheOpenGraphData(t, e) {
  e = (/^(https?:\/\/)?(www\.)?(twitter\.com|x\.com|t\.co)/i.test(t) ? extractTwitterData : extractOpenGraphData)(e);
  return await memcache.set(getHash("getHtml:ogData:" + t), JSON.stringify(e), {
    lifetime: 86400
  }), e;
}

async function followRedirect(e) {
  try {
    var t = await axios.get(e, {
      maxRedirects: 0,
      validateStatus: t => 200 <= t && t < 400
    });
    return t.headers.location || t.headers.Location || t.request.res.headers.location || t.request.res.headers.Location || e;
  } catch (t) {
    return console.error(`Error following redirect for ${e}:`, t), e;
  }
}

const getHtml = async (e, a = !1) => {
  var t = await memcache.get(getHash("getHtml:ogData:" + e));
  if (t) return JSON.parse(t.value);
  let r;
  try {
    if (/^(https?:\/\/)?(www\.)?(twitter\.com|x\.com|t\.co)/i.test(e)) {
      let t = e.replace("twitter.com", "x.com");
      t.includes("t.co") && (t = await followRedirect(t));
      var i = (await axios.get("https://publish.x.com/oembed?url=" + t, {
        timeout: MAX_HTML_TIMEOUT,
        maxContentLength: MAX_HTML_CONTENT_LENGTH
      }))["data"];
      r = i.html;
    } else {
      var o = e.startsWith("http") ? e : "http://" + e, c = (await axios.get(o, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          DNT: "1"
        },
        timeout: MAX_HTML_TIMEOUT,
        maxContentLength: MAX_HTML_CONTENT_LENGTH
      }))["data"];
      r = c;
    }
  } catch (t) {
    throw a && console.error("caching getHTML error to prevent server overload"), 
    await memcache.set(getHash("getHtml:ogData:" + e), JSON.stringify({
      getHtmlError: "Error fetching HTML"
    }), {
      lifetime: 3600
    }), t;
  }
  return await fetchAndCacheOpenGraphData(e, r);
};

module.exports = {
  getHtml: getHtml,
  fetchAndCacheOpenGraphData: fetchAndCacheOpenGraphData
};