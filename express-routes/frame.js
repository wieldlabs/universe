const app = require("express").Router(), Sentry = require("@sentry/node"), Quest = require("../models/quests/Quest")["Quest"], Account = require("../models/Account")["Account"], {
  Reactions,
  Links
} = require("../models/farcaster"), CommunityQuest = require("../models/quests/CommunityQuest")["CommunityQuest"], _QuestService = require("../services/QuestService")["Service"], _CacheService = require("../services/cache/CacheService")["Service"], _CommunityQuestMutationService = require("../services/mutationServices/CommunityQuestMutationService")["Service"], sharp = require("sharp"), config = require("../helpers/constants/config")["config"], contractConfig = require("../helpers/config")["config"], memcache = require("../connectmemcache")["memcache"], satori = require("satori").default, fs = require("fs").promises, path = require("path"), {
  frameContext,
  getAddressPasses
} = require("../helpers/farcaster-utils"), isFollowingChannel = require("../helpers/farcaster")["isFollowingChannel"], fetch = require("node-fetch"), axios = require("axios"), fetchAndCacheOpenGraphData = require("../helpers/opengraph")["fetchAndCacheOpenGraphData"], {
  limiter,
  authContext
} = require("../helpers/express-middleware"), validateAndCreateMetadata = require("../helpers/domain-metadata")["validateAndCreateMetadata"], RegistrarService = require("../services/RegistrarService")["Service"], generateUsername = require("friendly-username-generator")["generateUsername"], createReferral = require("../helpers/referral")["createReferral"], abcToIndex = {
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
    var i = `API:frame:generateSchoolImageMiddleware:${a}:${n}:` + o, c = await memcache.get(i);
    if (c) return t.imageContent = c.value, t.imageType = n, r();
    var s = await Quest.findById(a), m = path.join(__dirname, "../helpers/constants/Inter/static/Inter-Regular.ttf"), p = path.join(__dirname, "../helpers/constants/Inter/static/Inter-ExtraBold.ttf"), f = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ l, d, u ] = await Promise.all([ fs.readFile(m), fs.readFile(p), fs.readFile(f) ]), g = (t.quest = s).requirements?.[0]?.data || [], h = g.find(e => "question" === e.key)?.value, y = g.find(e => "answers" === e.key)?.value.split(";"), v = "false" !== o, w = [ {
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
    }, y.map((e, t) => ({
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
    })) ], b = (v || w.push({
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
        children: w,
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
        data: u,
        weight: 400,
        style: "normal"
      } ]
    }));
    if ("png" === n) try {
      var S = await getPngFromSvg(b);
      t.imageContent = S, t.imageType = "png";
    } catch (e) {
      console.error(e), t.imageContent = b, t.imageType = "svg";
    } else if ("jpg" === n) try {
      var I = await getJpgFromSvg(b);
      t.imageContent = I, t.imageType = "jpg";
    } catch (e) {
      console.error(e), t.imageContent = b, t.imageType = "svg";
    } else t.imageContent = b, t.imageType = "svg";
    await memcache.set(i, t.imageContent, {
      lifetime: 86400
    }), r();
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
    var o = JSON.parse(a), i = `API:frame:generateRewardImageMiddleware:${o._id}:` + n;
    try {
      var c = await memcache.get(i);
      if (c) return t.imageContent = c.value, t.imageType = n, r();
    } catch (e) {
      console.error(e);
    }
    var s = path.join(__dirname, "../helpers/constants/Inter/static/Inter-Regular.ttf"), m = path.join(__dirname, "../helpers/constants/Inter/static/Inter-ExtraBold.ttf"), p = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ , , f ] = await Promise.all([ fs.readFile(s), fs.readFile(m), fs.readFile(p) ]), l = await new _QuestService().getQuestReward(o), d = getRewardImage(o, l), u = getRewardRarity(o, l), g = o?.quantity || 0, h = o?.title || "Reward", y = [ {
      type: "img",
      props: {
        src: await convertImageToBase64(d, "image/png"),
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
        children: h + " x " + g,
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
        children: y,
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
      var w = await getPngFromSvg(v);
      t.imageContent = w, t.imageType = "png";
    } catch (e) {
      console.error(e), t.imageContent = v, t.imageType = "svg";
    } else if ("jpg" === n) try {
      var b = await getJpgFromSvg(v);
      t.imageContent = b, t.imageType = "jpg";
    } catch (e) {
      console.error(e), t.imageContent = v, t.imageType = "svg";
    } else t.imageContent = v, t.imageType = "svg";
    await memcache.set(i, t.imageContent, {
      lifetime: 86400
    }), r();
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
  o = o ? t : r;
  let i = 0, c = 0;
  var r = await memcache.get(`API:frame:checkCanSpin:${t}:` + e);
  if (r && (i = r.value, c = r.value), !i) {
    i = t && (r = (await getAddressPasses(t, !0))["isHolder"], r) ? 6 : n ? 1 : 0;
    let e;
    a?.castId?.hash && (e = "0x" + Buffer.from(a?.castId?.hash).toString("hex"));
    var [ r, n, a, o ] = await Promise.all([ Reactions.exists({
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
    i = (i = i + (r ? 1 : 0) + (n ? 1 : 0)) + (a ? 1 : 0) + (o ? 1 : 0);
  }
  i !== c && await memcache.set(`API:frame:checkCanSpin:${t}:` + e, i, {
    lifetime: 15
  });
  let s = 0;
  try {
    var m = await getSpinCount({
      address: t,
      questId: e
    });
    null !== m ? s = m : await incrSpinCount({
      address: t,
      questId: e,
      overrideValue: 0
    });
  } catch (e) {
    console.error(e);
  }
  return [ 0 < i - s, i - s ];
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
  var e = new Date(config().FARSCHOOL_START_DATE), t = new Date(), t = Math.floor((t - e) / 864e5);
  return "Lesson " + Math.min(t + 1, 150);
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
  var n = config().FARSCHOOL_COMMUNITY_ID, r = getQuestTitle(), o = await Quest.findOne({
    community: n,
    title: r
  }), r = o.requirements?.[0]?.data || [], i = r.find(e => "answers" === e.key)?.value.split(";"), c = r?.find(e => "correctAnswer" === e.key)?.value, s = i?.map((e, t) => `<meta property="fc:frame:button:${t + 1}" content="${abcToIndex[t + 1]}" />`);
  let m, p, f;
  switch (a) {
   case STEPS.START:
    m = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png", p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", 
    f = s.join("\n");
    break;

   case STEPS.ANSWERED:
    {
      let e = 1;
      try {
        e = parseInt(t.body?.untrustedData?.buttonIndex);
      } catch (e) {}
      var l = e - 1 == c;
      f = l ? (m = config().FARQUEST_URI + `/og/farschool${config().FARSCHOOL_SEASON}.gif`, 
      p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=spin", `
         <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="✅ spin now!" />
      `) : (m = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png&isCorrectAnswer=false", 
      p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", s.join("\n"));
      break;
    }

   case STEPS.SPIN:
    var [ l, d ] = await checkCanSpin({
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
    f = l ? (p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=reward", 
    l = await getRandomReward({
      communityId: n,
      questId: o._id,
      account: u
    }), await incrSpinCount({
      address: t.context.connectedAddress,
      questId: o._id
    }), m = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png&reward=" + encodeURIComponent(JSON.stringify(l)), 
    u = `Just got ${l?.title} on @farquest, get your free daily spins before they expire on https://far.quest/school 🎩🎩🎩 `, 
    l = `Just got ${l?.title} on FarQuest by @wieldlabs, get your free daily spins before they expire on https://far.quest/school and learn about Farcaster today 🎩🎩🎩 `, 
    u = `https://warpcast.com/~/compose?text=${encodeURIComponent(u)}&embeds[]=https://far.quest/school&rand=` + Math.random().toString()?.slice(0, 7), 
    `
                <meta property="fc:frame:button:1" content="Share on X" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${"https://x.com/intent/post?text=" + encodeURIComponent(l)}" />
                <meta property="fc:frame:button:2" content="Share on 🟪" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="${u}" />

         <meta property="fc:frame:button:3:action" content="post" />
        <meta property="fc:frame:button:3" content="${`Spin again (${d ? d - 1 : 0} left)`}" />
      `) : (m = config().FARQUEST_URI + `/og/farschool${config().FARSCHOOL_SEASON}-spins.gif`, 
    p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=reward", `
        <meta property="fc:frame:button:1" content="Mint .cast" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://far.quest" />
         <meta property="fc:frame:button:2:action" content="post" />
        <meta property="fc:frame:button:2" content="Refresh" />
      `);
    break;

   case STEPS.REWARD:
    m = config().FARQUEST_URI + `/og/farschool${config().FARSCHOOL_SEASON}.gif`, 
    p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=spin", f = `
         <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="✅ spin now!" />
      `;
    break;

   default:
    m = config().DEFAULT_URI + "/frame/v1/school?id=" + o._id + "&type=png", p = config().DEFAULT_URI + "/frame/v1/school/post_url?step=answered", 
    f = s.join("\n");
  }
  let g = `
      <!DOCTYPE html>
    <html>
      <head>
				<meta property="fc:frame" content="vNext" />
				<meta property="fc:frame:image" content=${m} />
        <meta property="fc:frame:post_url" content=${p} />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
  `;
  f && (g += f), g += `        
      </head>
    </html>`, e.setHeader("Content-Type", "text/html"), e.send(g);
}), app.get("/v1/mint-bebdomain", async (e, t) => {
  var r = config().DEFAULT_URI + "/frame/v1/mint-bebdomain/image", a = `
    <meta property="fc:frame:button:1:action" content="post" />
    <meta property="fc:frame:input:text" content="Name your handle (optional)" />
    <meta property="fc:frame:button:1" content="Confirm" />
  `;
  let n = `
      <!DOCTYPE html>
    <html>
      <head>
				<meta property="og:title" content="Mint .cast" />
				<meta property="og:description" content="Mint your .cast handle now!" />
				<meta property="og:image" content=${r} />
				<meta property="og:url" content="https://far.quest" />
				<meta property="fc:frame" content="vNext" />
				<meta property="fc:frame:image" content=${r} />
        <meta property="fc:frame:post_url" content=${config().DEFAULT_URI + "/frame/v1/mint-bebdomain?step=mint"} />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        <script>
          window.location.replace("https://far.quest");
        </script>
  `;
  n = n + a + `        
      </head>
    </html>`, t.setHeader("Content-Type", "text/html"), t.send(n);
}), app.post("/v1/mint-bebdomain", frameContext, async (e, t) => {
  var r, a = e.query["step"];
  let n, o, i;
  if (a && "choose_handle" !== a) {
    if ("mint" === a) try {
      let t = e.context?.untrustedData?.inputText || "";
      if (!t) for (t = generateUsername({
        useRandomNumber: !0
      }); !t || t.length < 7; ) t = generateUsername({
        useRandomNumber: !0
      });
      var c = 7 <= (t = t.replace(".cast", "").replace("op_", "").toLowerCase()).length;
      c && (t = "op_" + t);
      try {
        await validateAndCreateMetadata(t);
      } catch (e) {
        throw new Error("Invalid domain name: " + e.message);
      }
      try {
        var s = new RegistrarService(), m = new RegistrarService("optimism");
        let e = !1;
        if (!(e = c ? await m.available(t) : await s.available(t))) throw new Error("Domain not available");
      } catch (e) {
        throw new Error(e);
      }
      var p = c ? "https://far.quest/BEB-OP.jpg" : "https://far.quest/BEB-premium.jpg", f = (n = p, 
      r = config().DEFAULT_URI + "/contracts/v1/transactions/mint-bebdomain/data?bebdomain=" + t, 
      o = config().DEFAULT_URI + "/frame/v1/mint-bebdomain/callback", config().DEFAULT_URI + "/frame/v1/mint-bebdomain?step=choose_handle"), l = config().DEFAULT_URI + "/frame/v1/mint-bebdomain?step=mint";
      i = `
              <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="⏪ Back" />
        <meta property="fc:frame:button:1:post_url" content="${f}" />

        <meta property="fc:frame:button:2:action" content="post" />
        <meta property="fc:frame:button:2" content="🔄 Random" />
        <meta property="fc:frame:button:2:post_url" content="${l}" />

    <meta property="fc:frame:button:3:action" content="tx" />
    <meta property="fc:frame:button:3" content="Mint ${t}.cast" />
    <meta property="fc:frame:button:3:target" content="${r}" />
    <meta property="fc:frame:state" content=${JSON.stringify({
        chain: c ? "optimism" : "ethereum",
        bebdomain: t
      })} />
  `;
    } catch (e) {
      n = "https://far.quest/frames/register/unavailable.jpg", o = config().DEFAULT_URI + "/frame/v1/mint-bebdomain?step=mint", 
      i = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:input:text" content="Name your handle (optional)" />
        <meta property="fc:frame:button:1" content="Confirm" />
      `, e.message.includes("Invalid domain name") ? n = "https://far.quest/frames/register/invalid.jpg" : e.message.includes("Domain not available") && (n = "https://far.quest/frames/register/unavailable.jpg");
    }
  } else n = config().DEFAULT_URI + "/frame/v1/mint-bebdomain/image", o = config().DEFAULT_URI + "/frame/v1/mint-bebdomain?step=mint", 
  i = `
    <meta property="fc:frame:button:1:action" content="post" />
    <meta property="fc:frame:input:text" content="Name your handle (optional)" />
    <meta property="fc:frame:button:1" content="Confirm" />
  `;
  let d = `
      <!DOCTYPE html>
    <html>
      <head>
				<meta property="fc:frame" content="vNext" />
				<meta property="fc:frame:image" content=${n} />
        <meta property="fc:frame:post_url" content=${o} />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
  `;
  i && (d += i), d += `        
      </head>
    </html>`, t.setHeader("Content-Type", "text/html"), t.send(d);
}), app.post("/v1/mint-bebdomain/callback", frameContext, async (e, t) => {
  var r = e.body?.untrustedData?.transactionId, a = e.context?.untrustedData?.referralCode;
  let n = "optimism", o = "";
  if (e.context?.untrustedData?.state && (i = JSON.parse(e.context.untrustedData.state), 
  n = i.chain, o = i.bebdomain), a) try {
    await createReferral({
      referralCode: a,
      address: e.context.connectedAddress,
      hash: r
    });
  } catch (e) {
    Sentry.captureException("Unable to create referral: " + e.message);
  }
  var i = "optimism" === n ? "https://optimistic.etherscan.io/tx/" + r : "https://etherscan.io/tx/" + r, a = config().DEFAULT_URI + "/frame/v1/mint-bebdomain?step=mint", e = config().DEFAULT_URI + "/frame/v1/mint-bebdomain", r = `
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1" content="View tx" />
    <meta property="fc:frame:button:1:target" content="${i}" />
    
              <meta property="fc:frame:button:2" content="Share" />
    <meta property="fc:frame:button:2:action" content="link" />
    <meta property="fc:frame:button:2:target" content="${`https://warpcast.com/~/compose?text=${encodeURIComponent("Just minted " + ((o ? o + ".cast" : null) || "my .cast handle") + " from far.quest ✨\n\n")}&embeds[]=${e}&rand=` + Math.random().toString().slice(0, 7)}" />

    <meta property="fc:frame:button:3" content="Mint another" />
      <meta property="fc:frame:button:3:action" content="post" />
      <meta property="fc:frame:button:3:post_url" content="${e}" />
  `;
  let c = `
      <!DOCTYPE html>
    <html>
      <head>
				<meta property="fc:frame" content="vNext" />
				<meta property="fc:frame:image" content=https://far.quest/frames/register/success.jpg />
        <meta property="fc:frame:post_url" content=${a} />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
  `;
  r && (c += r), c += `        
      </head>
    </html>`, t.setHeader("Content-Type", "text/html"), t.send(c);
}), app.get("/v1/mint-bebdomain/image", (e, t) => {
  t.setHeader("Cache-Control", "public, max-age=86400"), t.redirect("https://far.quest/frames/register/start.jpg");
}), app.post("/v1/channel/whoami/post_url", frameContext, async (e, t) => {
  var r = e.query["step"];
  if (!e.context) return t.status(401).json({
    success: !1,
    message: "Unauthorized"
  });
  let a, n, o;
  var i = e.context.frameData.fid, c = e.context.connectedAddress;
  switch (r) {
   case void 0:
    a = "https://i.imgur.com/NF7zI9l.gif", n = config().DEFAULT_URI + "/frame/v1/channel/whoami/post_url?step=mint", 
    o = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
    break;

   case "mint":
    var s = await isFollowingChannel(i, "whoami"), m = await new _CacheService().get({
      key: "Frame:Channel:Minted:" + c
    });
    if (s && !m) try {
      a = "https://i.imgur.com/wcKhqNs.png", n = "", o = `
          <meta property="fc:frame:button:1" content="Mint closed" />
        `;
    } catch (e) {
      console.error(e), a = "https://i.imgur.com/NF7zI9l.gif", n = "", o = `
          <meta property="fc:frame:button:1" content="Mint closed." />
        `;
    } else o = m ? (a = "https://i.imgur.com/evIp6nB.png", n = "", `
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
}), app.post("/v1/fetch-frame", limiter, async (e, t) => {
  var {
    proxyUrl: e,
    untrustedData: r,
    trustedData: a,
    action: n
  } = e.body;
  try {
    var o, i = await axios.post(e, {
      untrustedData: r,
      trustedData: a
    });
    "post_redirect" === n && i.request?.res?.responseUrl !== e ? t.json({
      success: !0,
      message: "Successfully redirected",
      data: {
        url: i.request?.res?.responseUrl
      },
      redirect: !0
    }) : "tx" === n ? t.json({
      success: !0,
      message: "Successfully fetched tx",
      data: i.data,
      redirect: !0
    }) : (o = await fetchAndCacheOpenGraphData(e, i.data), t.json({
      success: !0,
      message: "Successfully fetched frame",
      data: o
    }));
  } catch (e) {
    console.error("Failed to fetch frame: " + e.message), t.status(500).json({
      success: !1,
      message: "Error fetching frame: " + e.message
    });
  }
}), module.exports = {
  router: app
};