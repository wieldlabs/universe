const app = require("express").Router(), Sentry = require("@sentry/node"), Quest = require("../models/quests/Quest")["Quest"], Account = require("../models/Account")["Account"], {
  Reactions,
  Links
} = require("../models/farcaster"), CommunityQuest = require("../models/quests/CommunityQuest")["CommunityQuest"], _QuestService = require("../services/QuestService")["Service"], _CacheService = require("../services/cache/CacheService")["Service"], _CommunityQuestMutationService = require("../services/mutationServices/CommunityQuestMutationService")["Service"], sharp = require("sharp"), config = require("../helpers/constants/config")["config"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], satori = require("satori").default, fs = require("fs").promises, path = require("path"), {
  frameContext,
  getAddressPasses
} = require("../helpers/farcaster-utils"), fetch = require("node-fetch"), abcToIndex = {
  1: "A",
  2: "B",
  3: "C",
  4: "D"
};

async function convertImageToBase64(e, t) {
  e = await (await fetch(e)).arrayBuffer(), e = Buffer.from(e);
  if (!e || !e.length) throw new Error("Unable to fetch image");
  if (t || t.length || t[0]) return `data:${t};base64,` + e.toString("base64");
  throw new Error("Unsupported image type");
}

const getRewardImage = (e, t) => "IMAGE" === e?.type ? t?.src : "SCORE" === e?.type ? "https://far.quest/farpoints.png" : null, getRewardRarity = (e, t) => "IMAGE" === e?.type ? t?.metadata?.find(e => "rarity" === e.key)?.value : (e?.type, 
"common"), getTextColorByRarity = e => {
  switch (e) {
   case "legendary":
    return "#FFCF01";

   case "common":
    return "gray";

   case "rare":
    return "blue";

   case "epic":
    return "purple";

   default:
    return "yellow";
  }
};

async function getPngFromSvg(e) {
  try {
    return await sharp(Buffer.from(e)).png().toBuffer();
  } catch (e) {
    throw console.error("Error converting SVG to PNG with sharp:", e), e;
  }
}

async function getJpgFromSvg(e) {
  try {
    return await sharp(Buffer.from(e)).jpeg().toBuffer();
  } catch (e) {
    throw console.error("Error converting SVG Jpeg PNG with sharp:", e), e;
  }
}

const generateSchoolImageMiddleware = async (t, e, r) => {
  var {
    id: a,
    type: n = "png",
    isCorrectAnswer: o
  } = t.query;
  if (t.query.reward) return r();
  try {
    var i = getMemcachedClient(), s = `API:frame:generateSchoolImageMiddleware:${a}:${n}:` + o;
    try {
      var c = await i.get(s);
      if (c) return t.imageContent = c.value, t.imageType = n, r();
    } catch (e) {
      console.error(e);
    }
    var l = await Quest.findById(a), p = path.join(__dirname, "../helpers/constants/Inter/static/Inter-Regular.ttf"), m = path.join(__dirname, "../helpers/constants/Inter/static/Inter-ExtraBold.ttf"), d = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ f, g, u ] = await Promise.all([ fs.readFile(p), fs.readFile(m), fs.readFile(d) ]), y = (t.quest = l).requirements?.[0]?.data || [], h = y.find(e => "question" === e.key)?.value, w = y.find(e => "answers" === e.key)?.value.split(";"), v = "false" !== o, S = [ {
      type: "text",
      props: {
        children: h,
        style: {
          marginLeft: 16,
          marginRight: 16,
          textAlign: "center",
          color: "#FFCF01",
          fontSize: 48,
          fontWeight: 800,
          fontFamily: "Inter"
        }
      }
    }, w.map((e, t) => ({
      type: "text",
      props: {
        children: abcToIndex[t + 1] + ". " + e,
        style: {
          marginLeft: 16,
          marginRight: 16,
          marginTop: 36,
          color: "#FFFFFF",
          fontSize: 36,
          fontFamily: "Silkscreen",
          textAlign: "center"
        }
      }
    })) ], I = (v || S.push({
      type: "text",
      props: {
        children: "Try again",
        style: {
          marginLeft: 16,
          marginRight: 16,
          marginTop: 36,
          color: "#ED0000",
          fontSize: 36,
          fontFamily: "Silkscreen",
          textAlign: "center"
        }
      }
    }), await satori({
      type: "div",
      props: {
        children: S,
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: 800,
          height: 800,
          backgroundColor: "#0D0009"
        }
      }
    }, {
      width: 800,
      height: 800,
      fonts: [ {
        name: "Inter",
        data: f,
        weight: 400,
        style: "normal"
      }, {
        name: "Inter",
        data: g,
        weight: 800,
        style: "extrabold"
      }, {
        name: "Silkscreen",
        data: u,
        weight: 400,
        style: "normal"
      } ]
    }));
    if ("png" === n) try {
      var C = await getPngFromSvg(I);
      t.imageContent = C, t.imageType = "png";
    } catch (e) {
      console.error(e), t.imageContent = I, t.imageType = "svg";
    } else if ("jpg" === n) try {
      var R = await getJpgFromSvg(I);
      t.imageContent = R, t.imageType = "jpg";
    } catch (e) {
      console.error(e), t.imageContent = I, t.imageType = "svg";
    } else t.imageContent = I, t.imageType = "svg";
    try {
      await i.set(s, t.imageContent, {
        lifetime: 86400
      });
    } catch (e) {
      console.error(e);
    }
    r();
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.error = e, r();
  }
}, generateRewardImageMiddleware = async (t, e, r) => {
  var {
    reward: a,
    type: n = "png"
  } = t.query;
  if (!a) return r();
  try {
    var o = JSON.parse(a), i = getMemcachedClient(), s = `API:frame:generateRewardImageMiddleware:${o._id}:` + n;
    try {
      var c = await i.get(s);
      if (c) return t.imageContent = c.value, t.imageType = n, r();
    } catch (e) {
      console.error(e);
    }
    var l = path.join(__dirname, "../helpers/constants/Inter/static/Inter-Regular.ttf"), p = path.join(__dirname, "../helpers/constants/Inter/static/Inter-ExtraBold.ttf"), m = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ , , d ] = await Promise.all([ fs.readFile(l), fs.readFile(p), fs.readFile(m) ]), f = await new _QuestService().getQuestReward(o), g = getRewardImage(o, f), u = getRewardRarity(o, f), y = o?.quantity || 0, h = o?.title || "Reward", w = [ {
      type: "img",
      props: {
        src: await convertImageToBase64(g, "image/png"),
        style: {
          width: 100,
          height: 100
        }
      }
    }, {
      type: "text",
      props: {
        children: u,
        style: {
          marginLeft: 16,
          marginRight: 16,
          textAlign: "center",
          color: getTextColorByRarity(u),
          fontSize: 16,
          fontWeight: 400,
          fontFamily: "Silkscreen"
        }
      }
    }, {
      type: "text",
      props: {
        children: h + " x " + y,
        style: {
          marginLeft: 16,
          marginRight: 16,
          textAlign: "center",
          color: "white",
          fontSize: 24,
          fontWeight: 400,
          fontFamily: "Silkscreen"
        }
      }
    } ], v = await satori({
      type: "div",
      props: {
        children: w,
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: 400,
          height: 400,
          fontFamily: "Silkscreen",
          backgroundColor: "#0D0009"
        }
      }
    }, {
      width: 400,
      height: 400,
      fonts: [ {
        name: "Silkscreen",
        data: d,
        weight: 400,
        style: "normal"
      } ]
    });
    if ("png" === n) try {
      var S = await getPngFromSvg(v);
      t.imageContent = S, t.imageType = "png";
    } catch (e) {
      console.error(e), t.imageContent = v, t.imageType = "svg";
    } else if ("jpg" === n) try {
      var I = await getJpgFromSvg(v);
      t.imageContent = I, t.imageType = "jpg";
    } catch (e) {
      console.error(e), t.imageContent = v, t.imageType = "svg";
    } else t.imageContent = v, t.imageType = "svg";
    try {
      await i.set(s, t.imageContent, {
        lifetime: 86400
      });
    } catch (e) {
      console.error(e);
    }
    r();
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.error = e, r();
  }
}, getSpinCount = async ({
  address: e,
  questId: t
}) => {
  return await new _CacheService().get({
    key: `API:frame:checkCanSpin:alreadySpinned:${e}:` + t
  });
}, incrSpinCount = async ({
  address: e,
  questId: t,
  overrideValue: r = null
}) => {
  var a = new _CacheService(), e = `API:frame:checkCanSpin:alreadySpinned:${e}:` + t, t = await a.get({
    key: e
  });
  return a.set({
    key: e,
    value: null !== r ? r : (t || 0) + 1,
    expiresAt: new Date(Date.now() + 864e5)
  });
}, checkCanSpin = async ({
  address: t,
  fid: r,
  frameActionBody: a,
  questId: e,
  verifiedFrameData: n = !1,
  isExternal: o
} = {}) => {
  var i = getMemcachedClient(), o = o ? t : r;
  let s = 0, c = 0;
  try {
    var l = await i.get(`API:frame:checkCanSpin:${t}:` + e);
    l && (s = l.value, c = l.value);
  } catch (e) {
    console.error(e);
  }
  if (!s) {
    s = t && (r = (await getAddressPasses(t, !0))["isHolder"], r) ? 6 : n ? 1 : 0;
    let e;
    a?.castId?.hash && (e = "0x" + Buffer.from(a?.castId?.hash).toString("hex"));
    var [ l, r, n, a ] = await Promise.all([ Reactions.exists({
      targetHash: e,
      deletedAt: null,
      fid: o,
      reactionType: 1
    }), Reactions.exists({
      targetHash: e,
      deletedAt: null,
      reactionType: 2,
      fid: o
    }), Links.exists({
      fid: o,
      targetFid: "274",
      type: "follow",
      deletedAt: null
    }), Links.exists({
      fid: o,
      targetFid: "12741",
      type: "follow",
      deletedAt: null
    }) ]);
    s = (s = s + (l ? 1 : 0) + (r ? 1 : 0)) + (n ? 1 : 0) + (a ? 1 : 0);
  }
  if (s !== c) try {
    await i.set(`API:frame:checkCanSpin:${t}:` + e, s, {
      lifetime: 15
    });
  } catch (e) {
    console.error(e);
  }
  let p = 0;
  try {
    var m = await getSpinCount({
      address: t,
      questId: e
    });
    null !== m ? p = m : await incrSpinCount({
      address: t,
      questId: e,
      overrideValue: 0
    });
  } catch (e) {
    console.error(e);
  }
  return [ 0 < s - p, s - p ];
}, getRandomReward = async ({
  communityId: e,
  questId: t,
  account: r
}) => {
  var a = new _CommunityQuestMutationService(), n = await CommunityQuest.findOne({
    community: e,
    quest: t
  });
  if (n) return (await a._claimReward(n, {
    communityId: e,
    questId: t
  }, {
    account: r
  }))?.[0];
  throw new Error("No Quest found");
};

function getQuestTitle() {
  var e = new Date("2024-02-17"), t = new Date(), t = Math.floor((t - e) / 864e5);
  return "Lesson " + Math.min(t + 1, 90);
}

app.get("/v1/school", [ generateSchoolImageMiddleware, generateRewardImageMiddleware ], async (e, t) => {
  if (e.error) return t.status(500).json({
    code: "500",
    success: !1,
    message: e.error?.message
  });
  var r = "png" === e.imageType ? "image/png" : "jpg" === e.imageType ? "image/jpeg" : "image/svg+xml";
  t.setHeader("Content-Type", r), t.send(e.imageContent);
}), app.get("/v1/school/post_url/redirect", async (e, t) => {
  t.redirect(302, "https://far.quest/school");
}), app.post("/v1/invite/post_url", async (e, t) => {
  var {
    invite: e,
    isCast: r
  } = e.query;
  return t.redirect(302, r ? "https://far.quest/cast?invite=" + e : "https://far.quest/?invite=" + e);
});

const STEPS = {
  START: "start",
  ANSWERED: "answered",
  SPIN: "spin",
  NO_SPIN_LEFT: "no_spin_left",
  REWARD: "reward",
  END: "end"
};

app.post("/v1/school/post_url", frameContext, async (t, e) => {
  var {
    redirect: r,
    step: a
  } = t.query;
  if (r) return e.redirect(302, "https://far.quest/school");
  var n = "development" === process.env.NODE_ENV ? "62d30b3ec39cdc68e8074539" : "62d1ff4eb684dfa85287e0e7", r = getQuestTitle(), o = await Quest.findOne({
    community: n,
    title: r
  }), r = o.requirements?.[0]?.data || [], i = r.find(e => "answers" === e.key)?.value.split(";"), s = r?.find(e => "correctAnswer" === e.key)?.value, c = i?.map((e, t) => `<meta property="fc:frame:button:${t + 1}" content="${abcToIndex[t + 1]}" />`);
  let l, p, m;
  switch (a) {
   case STEPS.START:
    l = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png", p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", 
    m = c.join("\n");
    break;

   case STEPS.ANSWERED:
    {
      let e = 1;
      try {
        e = parseInt(t.body?.untrustedData?.buttonIndex);
      } catch (e) {}
      var d = e - 1 == s;
      m = d ? (l = config().FARQUEST_URI + "/og/farschool4.gif", p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=spin", 
      `
         <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="✅ spin now!" />
      `) : (l = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png&isCorrectAnswer=false", 
      p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", c.join("\n"));
      break;
    }

   case STEPS.SPIN:
    var [ d, f ] = await checkCanSpin({
      address: t.context.connectedAddress,
      fid: t.context.frameData.fid,
      frameActionBody: t.context.frameData.frameActionBody,
      questId: o._id,
      verifiedFrameData: t.context.verifiedFrameData,
      isExternal: t.context.isExternal
    }), g = await Account.findOrCreateByAddressAndChainId({
      address: t.context.connectedAddress,
      chainId: 1
    });
    m = d ? (p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=reward", 
    d = await getRandomReward({
      communityId: n,
      questId: o._id,
      account: g
    }), await incrSpinCount({
      address: t.context.connectedAddress,
      questId: o._id
    }), l = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png&reward=" + encodeURIComponent(JSON.stringify(d)), 
    g = `Just got ${d?.title} on @farquest, get your free daily spins before they expire on https://far.quest/school 🎩🎩🎩 `, 
    d = `Just got ${d?.title} on FarQuest by @wieldlabs, get your free daily spins before they expire on https://far.quest/school and learn about Farcaster today 🎩🎩🎩 `, 
    g = `https://warpcast.com/~/compose?text=${encodeURIComponent(g)}&embeds[]=https://far.quest/school&rand=` + Math.random().toString()?.slice(0, 7), 
    `
                <meta property="fc:frame:button:1" content="Share on X" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${"https://twitter.com/intent/tweet?text=" + encodeURIComponent(d)}" />
                <meta property="fc:frame:button:2" content="Share on 🟪" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="${g}" />

         <meta property="fc:frame:button:3:action" content="post" />
        <meta property="fc:frame:button:3" content="${`Spin again (${f ? f - 1 : 0} left)`}" />
      `) : (l = config().FARQUEST_URI + "/og/farschool4-spins.gif", p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=reward", 
    `
        <meta property="fc:frame:button:1" content="Mint .cast" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://far.quest" />
         <meta property="fc:frame:button:2:action" content="post" />
        <meta property="fc:frame:button:2" content="Refresh" />
      `);
    break;

   case STEPS.REWARD:
    l = config().FARQUEST_URI + "/og/farschool4.gif", p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=spin", 
    m = `
         <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="✅ spin now!" />
      `;
    break;

   default:
    l = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png", p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", 
    m = c.join("\n");
  }
  let u = `
      <!DOCTYPE html>
    <html>
      <head>
				<meta property="fc:frame" content="vNext" />
				<meta property="fc:frame:image" content=${l} />
        <meta property="fc:frame:post_url" content=${p} />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
  `;
  m && (u += m), u += `        
      </head>
    </html>`, e.setHeader("Content-Type", "text/html"), e.send(u);
}), module.exports = {
  router: app
};