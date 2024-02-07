const app = require("express").Router(), Sentry = require("@sentry/node"), Quest = require("../models/quests/Quest")["Quest"], _QuestService = require("../services/QuestService")["Service"], sharp = require("sharp"), config = require("../helpers/constants/config")["config"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"];

async function convertImageToBase64(e, t) {
  e = await (await fetch(e)).arrayBuffer(), e = Buffer.from(e);
  if (!e || !e.length) throw new Error("Unable to fetch image");
  if (t || t.length || t[0]) return `data:${t};base64,` + e.toString("base64");
  throw new Error("Unsupported image type");
}

const getRewardImage = (e, t) => "IMAGE" === e?.type ? t?.src : "SCORE" === e?.type ? "https://far.quest/farpoints.png" : null;

async function getPngFromSvg(e) {
  try {
    return await sharp(Buffer.from(e)).png().toBuffer();
  } catch (e) {
    throw console.error("Error converting SVG to PNG with sharp:", e), e;
  }
}

function wrapText(r, n, e) {
  let a = "";
  e = e.split(" ");
  let o = "", i = n.y;
  return e.forEach((e, t) => {
    (t + 1) % r == 0 ? (o += e, a += `
                <text x="${n.x}" y="${i}" font-family="${n.fontFamily}" font-size="${n.fontSize}" font-weight="${n.fontWeight}" text-anchor="${n.textAnchor}" fill="${n.fill}">
                    ${o}
                </text>`, o = "", i += parseInt(n.fontSize, 10)) : o += e + " ";
  }), o && (a += `
            <text x="${n.x}" y="${i}" font-family="${n.fontFamily}" font-size="${n.fontSize}" font-weight="${n.fontWeight}" text-anchor="${n.textAnchor}" fill="${n.fill}">
                ${o}
            </text>`), a;
}

const generateSchoolImageMiddleware = async (r, e, n) => {
  var {
    id: a,
    type: o
  } = r.query;
  try {
    var i = getMemcachedClient();
    try {
      var s = await i.get("API:frame:generateSchoolImageMiddleware:" + o);
      if (s) return r.imageContent = s, r.imageType = "png", n();
    } catch (e) {
      console.error(e);
    }
    var c = new _QuestService(), f = await Quest.findOne({
      _id: a
    });
    if (!f) throw new Error("Quest not found");
    var l = (r.quest = f).rewards?.[0], p = await c.getQuestReward(l), g = f.requirements?.[0]?.data || [], h = g.find(e => "question" === e.key)?.value, u = g.find(e => "answers" === e.key)?.value.split(";"), d = getRewardImage(l, p), m = l?.quantity || 0;
    wrapText(8, {
      x: 450,
      y: 240,
      fontFamily: "sans-serif",
      fontSize: "36",
      fontWeight: "900",
      textAnchor: "middle",
      fill: "#E8E3EA"
    }, h), u.map((e, t) => wrapText(8, {
      x: 450,
      y: 300 + 40 * (t + 1),
      fontFamily: "sans-serif",
      fontSize: "24",
      fontWeight: "900",
      textAnchor: "middle",
      fill: "#E8E3EA"
    }, t + 1 + ". " + e));
    let e;
    if (d) try {
      e = await convertImageToBase64(d, "image/png");
    } catch (e) {
      console.error(e);
    }
    let t = `
  <svg width="900" height="471" xmlns="http://www.w3.org/2000/svg" >
    <defs>
      <clipPath id="rounded-clip">
        <rect x="250" y="20" width="400" height="400" rx="50" ry="50" fill="#C9B1FF"/> <!-- Rounded rectangle -->
      </clipPath>
    </defs>
    <rect width="100%" height="100%" fill="#6A33E4"/>
    
    `;
    if (e && (t += `
          <image href="${e}" x="250" y="20" width="400" height="400" clip-path="url(#rounded-clip)" />
              <text x="486" y="320" font-family="sans-serif" font-size="48" font-weight="900" text-anchor="middle" fill="#FFF" stoke-color="#000" stroke-width="1">
          x${m}
        </text>
          `), t += "</svg>", "png" === o) try {
      var y = await getPngFromSvg(t);
      r.imageContent = y, r.imageType = "png";
    } catch (e) {
      console.error(e), r.imageContent = t, r.imageType = "svg";
    } else r.imageContent = t, r.imageType = "svg";
    n();
  } catch (e) {
    Sentry.captureException(e), console.error(e), r.error = e, n();
  }
};

app.get("/v1/school", generateSchoolImageMiddleware, async (e, t) => {
  if (e.error) return t.status(500).json({
    code: "500",
    success: !1,
    message: e.error?.message
  });
  var r = "png" === e.imageType ? "image/png" : "image/svg+xml";
  t.setHeader("Content-Type", r), t.send(e.imageContent);
}), app.get("/v1/school/post_url/redirect", async (e, t) => {
  t.redirect(302, "https://far.quest/school");
}), app.post("/v1/invite/post_url", async (e, t) => {
  var {
    invite: e,
    isCast: r
  } = e.query;
  return t.redirect(302, r ? "https://far.quest/cast?invite=" + e : "https://far.quest/?invite=" + e);
}), app.post("/v1/school/post_url", async (e, t) => {
  var {
    id: r,
    redirect: n
  } = e.query;
  if (n) return t.redirect(302, "https://far.quest/school");
  n = await Quest.findOne({
    _id: r
  });
  if (!n) throw new Error("Quest not found");
  let a = 1;
  try {
    a = parseInt(e.body?.untrustedData?.buttonIndex);
  } catch (e) {}
  r = n?.requirements?.[0]?.data || [], e = r.find(e => "answers" === e.key)?.value.split(";"), 
  r = r?.find(e => "correctAnswer" === e.key)?.value, e = e[a - 1], e && (e.toLowerCase(), 
  r?.toLowerCase()), e = `
      <!DOCTYPE html>
    <html>
      <head>
				<meta property="fc:frame" content="vNext" />
				<meta property="fc:frame:image" content=${config().DEFAULT_URI + "/frame/v1/school?id=" + n._id + "&type=png"} />
        <meta property="fc:frame:post_url" content=${config().DEFAULT_URI + "/frame/v1/school/post_url?redirect=true"} />
        <meta property="fc:frame:button:1:action" content="post_redirect" />
        <meta property="fc:frame:button:1" content="Claim your reward!" />
  `;
  t.send(e += `        
      </head>
    </html>`), t.setHeader("Content-Type", "text/html");
}), module.exports = {
  router: app
};