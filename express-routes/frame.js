const app = require("express").Router(), Sentry = require("@sentry/node"), Quest = require("../models/quests/Quest")["Quest"], Account = require("../models/Account")["Account"], {
  Reactions,
  Links
} = require("../models/farcaster"), CommunityQuest = require("../models/quests/CommunityQuest")["CommunityQuest"], _QuestService = require("../services/QuestService")["Service"], _CacheService = require("../services/cache/CacheService")["Service"], _CommunityQuestMutationService = require("../services/mutationServices/CommunityQuestMutationService")["Service"], sharp = require("sharp"), config = require("../helpers/constants/config")["config"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], satori = require("satori").default, fs = require("fs").promises, path = require("path"), {
  frameContext,
  getAddressPasses
} = require("../helpers/farcaster-utils"), isFollowingChannel = require("../helpers/farcaster")["isFollowingChannel"], fetch = require("node-fetch"), axios = require("axios"), abcToIndex = {
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
    var p = await Quest.findById(a), m = path.join(__dirname, "../helpers/constants/Inter/static/Inter-Regular.ttf"), l = path.join(__dirname, "../helpers/constants/Inter/static/Inter-ExtraBold.ttf"), f = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ d, g, u ] = await Promise.all([ fs.readFile(m), fs.readFile(l), fs.readFile(f) ]), h = (t.quest = p).requirements?.[0]?.data || [], y = h.find(e => "question" === e.key)?.value, w = h.find(e => "answers" === e.key)?.value.split(";"), v = "false" !== o, S = [ {
      type: "text",
      props: {
        children: y,
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
        data: d,
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
      var _ = await getJpgFromSvg(I);
      t.imageContent = _, t.imageType = "jpg";
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
    var p = path.join(__dirname, "../helpers/constants/Inter/static/Inter-Regular.ttf"), m = path.join(__dirname, "../helpers/constants/Inter/static/Inter-ExtraBold.ttf"), l = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ , , f ] = await Promise.all([ fs.readFile(p), fs.readFile(m), fs.readFile(l) ]), d = await new _QuestService().getQuestReward(o), g = getRewardImage(o, d), u = getRewardRarity(o, d), h = o?.quantity || 0, y = o?.title || "Reward", w = [ {
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
        children: y + " x " + h,
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
        data: f,
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
  let m = 0;
  try {
    var l = await getSpinCount({
      address: t,
      questId: e
    });
    null !== l ? m = l : await incrSpinCount({
      address: t,
      questId: e,
      overrideValue: 0
    });
  } catch (e) {
    console.error(e);
  }
  return [ 0 < s - m, s - m ];
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

async function mint({
  to: e
}) {
  e = {
    chainId: 666666666,
    contractAddress: "0x5a421b033A8cD44C023Ac684e313b6EF2c0cbF53",
    projectId: "69edacd2-a2c0-4b08-b163-8dc1af14a523",
    functionSignature: "mint(address to)",
    args: {
      to: e
    }
  };
  try {
    return (await axios.post("https://api.syndicate.io/transact/sendTransaction", e, {
      headers: {
        Authorization: "Bearer " + process.env.SYNDICATE_API_KEY,
        "Content-Type": "application/json"
      }
    })).data;
  } catch (e) {
    throw new Error(e);
  }
}

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
  let p, m, l;
  switch (a) {
   case STEPS.START:
    p = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png", m = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", 
    l = c.join("\n");
    break;

   case STEPS.ANSWERED:
    {
      let e = 1;
      try {
        e = parseInt(t.body?.untrustedData?.buttonIndex);
      } catch (e) {}
      var f = e - 1 == s;
      l = f ? (p = config().FARQUEST_URI + "/og/farschool4.gif", m = config().DEFAULT_URI + "/frame/v1/school/post_url?step=spin", 
      `
         <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="✅ spin now!" />
      `) : (p = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png&isCorrectAnswer=false", 
      m = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", c.join("\n"));
      break;
    }

   case STEPS.SPIN:
    var [ f, d ] = await checkCanSpin({
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
    l = f ? (m = config().DEFAULT_URI + "/frame/v1/school/post_url?step=reward", 
    f = await getRandomReward({
      communityId: n,
      questId: o._id,
      account: g
    }), await incrSpinCount({
      address: t.context.connectedAddress,
      questId: o._id
    }), p = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png&reward=" + encodeURIComponent(JSON.stringify(f)), 
    g = `Just got ${f?.title} on @farquest, get your free daily spins before they expire on https://far.quest/school 🎩🎩🎩 `, 
    f = `Just got ${f?.title} on FarQuest by @wieldlabs, get your free daily spins before they expire on https://far.quest/school and learn about Farcaster today 🎩🎩🎩 `, 
    g = `https://warpcast.com/~/compose?text=${encodeURIComponent(g)}&embeds[]=https://far.quest/school&rand=` + Math.random().toString()?.slice(0, 7), 
    `
                <meta property="fc:frame:button:1" content="Share on X" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${"https://twitter.com/intent/tweet?text=" + encodeURIComponent(f)}" />
                <meta property="fc:frame:button:2" content="Share on 🟪" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="${g}" />

         <meta property="fc:frame:button:3:action" content="post" />
        <meta property="fc:frame:button:3" content="${`Spin again (${d ? d - 1 : 0} left)`}" />
      `) : (p = config().FARQUEST_URI + "/og/farschool4-spins.gif", m = config().DEFAULT_URI + "/frame/v1/school/post_url?step=reward", 
    `
        <meta property="fc:frame:button:1" content="Mint .cast" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://far.quest" />
         <meta property="fc:frame:button:2:action" content="post" />
        <meta property="fc:frame:button:2" content="Refresh" />
      `);
    break;

   case STEPS.REWARD:
    p = config().FARQUEST_URI + "/og/farschool4.gif", m = config().DEFAULT_URI + "/frame/v1/school/post_url?step=spin", 
    l = `
         <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="✅ spin now!" />
      `;
    break;

   default:
    p = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png", m = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", 
    l = c.join("\n");
  }
  let u = `
      <!DOCTYPE html>
    <html>
      <head>
				<meta property="fc:frame" content="vNext" />
				<meta property="fc:frame:image" content=${p} />
        <meta property="fc:frame:post_url" content=${m} />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
  `;
  l && (u += l), u += `        
      </head>
    </html>`, e.setHeader("Content-Type", "text/html"), e.send(u);
}), app.post("/v1/channel/whoami/post_url", frameContext, async (e, t) => {
  var r = e.query["step"];
  let a, n, o;
  var i = e.context.frameData.fid, s = e.context.connectedAddress;
  switch (r) {
   case void 0:
    a = "https://i.imgur.com/NF7zI9l.gif", n = config().DEFAULT_URI + "/frame/v1/channel/whoami/post_url?step=mint", 
    o = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
    break;

   case "mint":
    var c = await isFollowingChannel(i, "whoami"), p = await new _CacheService().get({
      key: "Frame:Channel:Minted:" + s
    });
    if (c && !p) try {
      a = "https://i.imgur.com/wcKhqNs.png", n = "", o = `
          <meta property="fc:frame:button:1" content="Mint closed" />
        `;
    } catch (e) {
      console.error(e), a = "https://i.imgur.com/NF7zI9l.gif", n = "", o = `
          <meta property="fc:frame:button:1" content="Mint closed." />
        `;
    } else o = p ? (a = "https://i.imgur.com/evIp6nB.png", n = "", `
          <meta property="fc:frame:button:1" content="Already Minted!" />
        `) : (a = "https://i.imgur.com/6DINV3b.png", n = config().DEFAULT_URI + "/frame/v1/channel/whoami/post_url?step=mint", 
    `
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://warpcast.com/~/channel/whoami" />
          <meta property="fc:frame:button:1" content="Follow /whoami" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:button:2" content="Try Again" />
        `);
    break;

   default:
    a = "https://i.imgur.com/NF7zI9l.gif", n = config().DEFAULT_URI + "/frame/v1/channel/whoami/post_url", 
    o = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
  }
  e = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${a}" />
        <meta property="fc:frame:post_url" content="${n}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${o}
      </head>
    </html>`;
  t.setHeader("Content-Type", "text/html"), t.send(e);
}), module.exports = {
  router: app
};