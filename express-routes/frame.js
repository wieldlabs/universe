const app = require("express").Router(), Sentry = require("@sentry/node"), Quest = require("../models/quests/Quest")["Quest"], Account = require("../models/Account")["Account"], {
  Reactions,
  Links
} = require("../models/farcaster"), CommunityQuest = require("../models/quests/CommunityQuest")["CommunityQuest"], _QuestService = require("../services/QuestService")["Service"], _CacheService = require("../services/cache/CacheService")["Service"], _CommunityQuestMutationService = require("../services/mutationServices/CommunityQuestMutationService")["Service"], sharp = require("sharp"), config = require("../helpers/constants/config")["config"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], satori = require("satori").default, fs = require("fs").promises, path = require("path"), {
  frameContext,
  getAddressPasses
} = require("../helpers/farcaster-utils"), abcToIndex = {
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
    type: n,
    isCorrectAnswer: o
  } = t.query;
  if (t.query.reward) return r();
  try {
    var i = await Quest.findById(a), s = path.join(__dirname, "../helpers/constants/Inter/static/Inter-Regular.ttf"), c = path.join(__dirname, "../helpers/constants/Inter/static/Inter-ExtraBold.ttf"), p = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ l, d, f ] = await Promise.all([ fs.readFile(s), fs.readFile(c), fs.readFile(p) ]), m = (t.quest = i).requirements?.[0]?.data || [], u = m.find(e => "question" === e.key)?.value, g = m.find(e => "answers" === e.key)?.value.split(";"), y = "false" !== o, h = [ {
      type: "text",
      props: {
        children: u,
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
    }, g.map((e, t) => ({
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
    })) ], w = (y || h.push({
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
        children: h,
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
        data: l,
        weight: 400,
        style: "normal"
      }, {
        name: "Inter",
        data: d,
        weight: 800,
        style: "extrabold"
      }, {
        name: "Silkscreen",
        data: f,
        weight: 400,
        style: "normal"
      } ]
    }));
    if ("png" === n) try {
      var v = await getPngFromSvg(w);
      t.imageContent = v, t.imageType = "png";
    } catch (e) {
      console.error(e), t.imageContent = w, t.imageType = "svg";
    } else if ("jpg" === n) try {
      var S = await getJpgFromSvg(w);
      t.imageContent = S, t.imageType = "jpg";
    } catch (e) {
      console.error(e), t.imageContent = w, t.imageType = "svg";
    } else t.imageContent = w, t.imageType = "svg";
    r();
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.error = e, r();
  }
}, generateRewardImageMiddleware = async (t, e, r) => {
  var {
    reward: a,
    type: n = "jpg"
  } = t.query;
  if (!a) return r();
  try {
    var o = JSON.parse(a), i = path.join(__dirname, "../helpers/constants/Inter/static/Inter-Regular.ttf"), s = path.join(__dirname, "../helpers/constants/Inter/static/Inter-ExtraBold.ttf"), c = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ , , p ] = await Promise.all([ fs.readFile(i), fs.readFile(s), fs.readFile(c) ]), l = await new _QuestService().getQuestReward(o), d = getRewardImage(o, l), f = getRewardRarity(o, l), m = o?.quantity || 0, u = o?.title || "Reward", g = [ {
      type: "img",
      props: {
        src: d,
        style: {
          width: 100,
          height: 100
        }
      }
    }, {
      type: "text",
      props: {
        children: f,
        style: {
          marginLeft: 16,
          marginRight: 16,
          textAlign: "center",
          color: getTextColorByRarity(f),
          fontSize: 16,
          fontWeight: 400,
          fontFamily: "Silkscreen"
        }
      }
    }, {
      type: "text",
      props: {
        children: u + " x " + m,
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
    } ], y = await satori({
      type: "div",
      props: {
        children: g,
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
        data: p,
        weight: 400,
        style: "normal"
      } ]
    });
    if ("png" === n) try {
      var h = await getPngFromSvg(y);
      t.imageContent = h, t.imageType = "png";
    } catch (e) {
      console.error(e), t.imageContent = y, t.imageType = "svg";
    } else if ("jpg" === n) try {
      var w = await getJpgFromSvg(y);
      t.imageContent = w, t.imageType = "jpg";
    } catch (e) {
      console.error(e), t.imageContent = y, t.imageType = "svg";
    } else t.imageContent = y, t.imageType = "svg";
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
    var p = await i.get(`API:frame:checkCanSpin:${t}:` + e);
    p && (s = p.value, c = p.value);
  } catch (e) {
    console.error(e);
  }
  if (!s) {
    s = t && (r = (await getAddressPasses(t, !0))["isHolder"], r) ? 6 : n ? 1 : 0;
    let e;
    a?.castId?.hash && (e = "0x" + Buffer.from(a?.castId?.hash).toString("hex"));
    var [ p, r, n, a ] = await Promise.all([ Reactions.exists({
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
    s = (s = s + (p ? 1 : 0) + (r ? 1 : 0)) + (n ? 1 : 0) + (a ? 1 : 0);
  }
  if (s !== c) try {
    await i.set(`API:frame:checkCanSpin:${t}:` + e, s, {
      lifetime: 15
    });
  } catch (e) {
    console.error(e);
  }
  let l = 0;
  try {
    var d = await getSpinCount({
      address: t,
      questId: e
    });
    null !== d ? l = d : await incrSpinCount({
      address: t,
      questId: e,
      overrideValue: 0
    });
  } catch (e) {
    console.error(e);
  }
  return [ 0 < s - l, s - l ];
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
  var e = new Date("2024-02-17"), t = new Date();
  return "Lesson " + (Math.floor((t - e) / 864e5) + 1);
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
  let p, l, d;
  switch (a) {
   case STEPS.START:
    p = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=jpg", l = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", 
    d = c.join("\n");
    break;

   case STEPS.ANSWERED:
    {
      let e = 1;
      try {
        e = parseInt(t.body?.untrustedData?.buttonIndex);
      } catch (e) {}
      var f = e - 1 == s;
      d = f ? (p = config().FARQUEST_URI + "/og/farschool4.gif", l = config().DEFAULT_URI + "/frame/v1/school/post_url?step=spin", 
      `
         <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="✅ spin now!" />
      `) : (p = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=jpg&isCorrectAnswer=false", 
      l = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", c.join("\n"));
      break;
    }

   case STEPS.SPIN:
    var [ f, m ] = await checkCanSpin({
      address: t.context.connectedAddress,
      fid: t.context.frameData.fid,
      frameActionBody: t.context.frameData.frameActionBody,
      questId: o._id,
      verifiedFrameData: t.context.verifiedFrameData,
      isExternal: t.context.isExternal
    }), u = await Account.findOrCreateByAddressAndChainId({
      address: t.context.connectedAddress,
      chainId: 1
    });
    d = f ? (l = config().DEFAULT_URI + "/frame/v1/school/post_url?step=reward", 
    f = await getRandomReward({
      communityId: n,
      questId: o._id,
      account: u
    }), await incrSpinCount({
      address: t.context.connectedAddress,
      questId: o._id
    }), p = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=jpg&reward=" + encodeURIComponent(JSON.stringify(f)), 
    u = `Just got ${f?.title} on @farquest, get your free daily spins before they expire on https://far.quest/school 🎩🎩🎩 `, 
    f = `Just got ${f?.title} on FarQuest by @wieldlabs, get your free daily spins before they expire on https://far.quest/school and learn about Farcaster today 🎩🎩🎩 `, 
    u = `https://warpcast.com/~/compose?text=${encodeURIComponent(u)}&embeds[]=https://far.quest/school&rand=` + Math.random().toString()?.slice(0, 7), 
    `
                <meta property="fc:frame:button:1" content="Share on X" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${"https://twitter.com/intent/tweet?text=" + encodeURIComponent(f)}" />
                <meta property="fc:frame:button:2" content="Share on 🟪" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="${u}" />

         <meta property="fc:frame:button:3:action" content="post" />
        <meta property="fc:frame:button:3" content="${`Spin again (${m ? m - 1 : 0} left)`}" />
      `) : (p = config().FARQUEST_URI + "/og/farschool4-spins.gif", l = config().DEFAULT_URI + "/frame/v1/school/post_url?step=reward", 
    `
        <meta property="fc:frame:button:1" content="Mint .cast" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://far.quest" />
         <meta property="fc:frame:button:2:action" content="post" />
        <meta property="fc:frame:button:2" content="Refresh" />
      `);
    break;

   case STEPS.REWARD:
    p = config().FARQUEST_URI + "/og/farschool4.gif", l = config().DEFAULT_URI + "/frame/v1/school/post_url?step=spin", 
    d = `
         <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="✅ spin now!" />
      `;
    break;

   default:
    p = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=jpg", l = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", 
    d = c.join("\n");
  }
  let g = `
      <!DOCTYPE html>
    <html>
      <head>
				<meta property="fc:frame" content="vNext" />
				<meta property="fc:frame:image" content=${p} />
        <meta property="fc:frame:post_url" content=${l} />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
  `;
  d && (g += d), g += `        
      </head>
    </html>`, e.setHeader("Content-Type", "text/html"), e.send(g);
}), module.exports = {
  router: app
};