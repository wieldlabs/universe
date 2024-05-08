const axios = require("axios"), cheerio = require("cheerio"), Image = require("../models/Image")["Image"];

async function fetchDirectImageUrl(e) {
  const r = new AbortController();
  var a = setTimeout(() => r.abort(), 5e3);
  try {
    var t = await axios.get(e, {
      signal: r.signal
    }), o = (clearTimeout(a), t.data), i = cheerio.load(o), g = i('meta[property="og:image"]').attr("content"), m = i("img").first().attr("src");
    return g || m || e;
  } catch (e) {
    return clearTimeout(a), console.error("Error fetching direct image URL: " + e), 
    null;
  }
}

async function uploadBufferedImage(e) {
  return await Image.uploadImage({
    image: e
  });
}

async function getImageUrlOrUploadImage(e) {
  var r = e.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (r) e = "https://drive.google.com/uc?export=view&id=" + r[1]; else {
    if (/\.(jpeg|jpg|gif|png|svg)$/.test(e)) return e;
    e = await Promise.race([ fetchDirectImageUrl(e), new Promise((e, r) => setTimeout(() => r(new Error("Timeout")), 4e3)) ]);
  }
  try {
    var a, t = await axios.get(e, {
      responseType: "arraybuffer"
    });
    return t.headers["content-type"].startsWith("image") ? (a = await uploadBufferedImage(Buffer.from(t.data, "binary"))).result.variants[a.result.variants.length - 1] : e;
  } catch (e) {
    throw new Error(e);
  }
}

module.exports = {
  getImageUrlOrUploadImage: getImageUrlOrUploadImage,
  uploadBufferedImage: uploadBufferedImage
};