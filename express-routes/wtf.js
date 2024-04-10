const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), ethers = require("ethers"), factoryContractAbi = require("../helpers/abi/public-mint-nft-capped-factory.json"), nftAbi = require("../helpers/abi/public-mint-nft.json"), axios = require("axios"), frameContext = require("../helpers/farcaster-utils")["frameContext"], config = require("../helpers/constants/config")["config"], Contract = require("../models/wallet/Contract")["Contract"], CacheService = require("../services/cache/CacheService")["Service"], cacheService = new CacheService(), generateImageWithText = require("../helpers/generate-image")["generateImageWithText"], heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 100,
  message: "Too many requests! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), MAX_MINT_COUNT = 100, factoryContractAddress = "0x831f011B38Fd707229B2D1fCF3C8a1964200c9fe", factoryContractInterfaceType = "WTF1";

async function createContract({
  name: t,
  symbol: a,
  totalCap: r,
  ownerAddress: n,
  baseUrl: o
}) {
  try {
    if (!(t && a && r && n)) throw new Error("Missing required fields!");
    var c = process.env.FARCAST_KEY, s = ethers.Wallet.fromMnemonic(c), i = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), d = s.connect(i), m = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, d).deployCappedNFTContract(t, a, r, n, o), p = (console.log(m), 
    await m.wait());
    let e;
    var f = (p.events || []).find(e => "ContractDeployed" === e.event);
    return f ? (e = f.args[0], console.log("New contract deployed at address: " + e)) : console.log("No 'ContractDeployed' event found."), 
    console.log("Contract deployed at address: " + m.address), {
      contractAddress: e,
      txHash: m.hash
    };
  } catch (e) {
    throw Sentry.captureException(e), console.error("Error deploying contract: " + e), 
    e;
  }
}

async function uploadMetadata({
  contractAddress: e,
  metadataContent: t,
  tokenId: a
}) {
  t = {
    type: "json",
    content: t
  };
  try {
    return (await axios.post(`https://api.syndicate.io/token-metadata/update/69edacd2-a2c0-4b08-b163-8dc1af14a523/666666666/${e}/` + a, t, {
      headers: {
        Authorization: "Bearer " + process.env.SYNDICATE_API_KEY,
        "Content-Type": "application/json"
      }
    })).data;
  } catch (e) {
    throw new Error(e);
  }
}

app.post("/v1/frames/:factory/create/contract", heavyLimiter, async (e, t) => {
  if ("production" === process.env.NODE_ENV) return t.json({
    code: "403",
    success: !1,
    message: "This endpoint is not available in production!"
  });
  try {
    var a = await Contract.createContract({
      name: e.body.name || "Contract-" + Math.random().toString(36).substring(2, 15),
      symbol: e.body.symbol || "CASTWTF",
      chainId: 666666666,
      address: "0x0",
      totalSupply: MAX_MINT_COUNT,
      contractDeployer: e.body.ownerAddress,
      tokenType: "ERC721",
      factoryInterfaceType: factoryContractInterfaceType
    }, !1), r = config().DEFAULT_URI + `/contracts/v1/metadata/${a.slug}/`, {
      contractAddress: n,
      txHash: o
    } = await createContract({
      ...e.body,
      baseUrl: r,
      totalCap: MAX_MINT_COUNT
    });
    return a.address = n, a.deployedTxHash = o, a.isVerified = !0, a.metadata = {
      name: e.body.name,
      imageUrl: e.body.image,
      description: e.body.description,
      externalUrl: "https://cast.wtf",
      frame: {
        frameImageUrl: e.body.image,
        framePostUrl: config().DEFAULT_URI + `/wtf/v1/contracts/${a._id}/frames/post_url?step=mint`,
        image: e.body.image,
        title: "Free Mint | " + e.body.name,
        description: "Free Mint | " + e.body.name,
        domain: "far.quest",
        frameButton1: {
          text: "Free Mint",
          action: "post"
        }
      }
    }, await a.save(), t.json({
      code: "201",
      success: !0,
      message: "Successfully created contract and cached whitelisted address.",
      contractAddress: n,
      txHash: o,
      contract: a
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      code: "500",
      success: !1,
      message: "Internal server error!"
    });
  }
}), app.post("/v1/frames/:factory/create/metadata", heavyLimiter, async (e, t) => {
  try {
    return await uploadMetadata({
      contractAddress: e.body.contractAddress,
      metadataContent: {
        image: e.body.image,
        name: e.body.name,
        description: e.body.description,
        external_url: "https://cast.wtf"
      },
      tokenId: 1
    }), t.json({
      code: "201",
      success: !0,
      message: "Successfully uploaded metadata and set metadata URI."
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      code: "500",
      success: !1,
      message: "Internal server error!"
    });
  }
});

const getMemcachedClient = require("../connectmemcached")["getMemcachedClient"];

async function mint({
  to: e,
  contractAddress: t
}) {
  try {
    var a = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), r = process.env.FARCAST_KEY, n = ethers.Wallet.fromMnemonic(r).connect(a), o = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, n).mintNftContract(t, e);
    return console.log(`Mint successful for address: ${e}, txHash: ` + o.hash), 
    o.hash;
  } catch (e) {
    throw console.error("Error in mintIfWhitelisted: " + e), e;
  }
}

app.post("/v1/contracts/:contractId/frames/post_url", frameContext, async (t, e) => {
  var a = t.query["step"];
  let r, n, o;
  t.context.frameData.fid;
  var c = t.context.connectedAddress;
  if (!c) return e.status(401).json({
    success: !1,
    message: "Unauthorized"
  });
  let s;
  var i = getMemcachedClient(), d = "contract:" + t.params.contractId;
  try {
    var m = await i.get(d);
    m ? s = JSON.parse(m.value) : (s = await Contract.findById(t.params.contractId), 
    await i.set(d, JSON.stringify(s), {
      lifetime: 604800
    }));
  } catch (e) {
    s = await Contract.findById(t.params.contractId);
  }
  if (!s || !s.metadata?.frame) return e.status(404).json({
    success: !1,
    message: "No Contract Frame found"
  });
  switch (a) {
   case void 0:
    r = s.metadata.frame.frameImageUrl, n = config().DEFAULT_URI + `/wtf/v1/contracts/${s._id}/frames/post_url?step=mint`, 
    o = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
    break;

   case "mint":
    if (!s.isVerified) throw new Error("Contract is not verified");
    var p = await cacheService.get({
      key: "Wtf:Frame:Minted",
      params: {
        connectedAddress: c,
        contractId: s._id
      }
    }), f = "Wtf:Frame:MintCount", l = await cacheService.get({
      key: f,
      params: {
        contractId: s._id
      }
    });
    if ((l = l ? parseInt(l) : 0) >= MAX_MINT_COUNT) r = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(s.metadata.frame.frameImageUrl)}&text=Mint%20Closed`, 
    n = "", o = `
          <meta property="fc:frame:button:1" content="Mint Closed" />
        `; else if (p) r = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(s.metadata.frame.frameImageUrl)}&text=Already%20Minted!`, 
    n = "", o = `
          <meta property="fc:frame:button:1" content="Already Minted! View Tx Hash" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://explorer.degen.tips/tx/${p}" />
        `; else try {
      var y = await mint({
        to: c,
        contractAddress: s.address
      });
      await cacheService.set({
        key: "Wtf:Frame:Minted",
        params: {
          connectedAddress: c,
          contractId: s._id
        },
        value: y,
        expiresAt: new Date(Date.now() + 36e5)
      }), await cacheService.set({
        key: f,
        value: (l + 1).toString()
      }), r = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(s.metadata.frame.frameImageUrl)}&text=Minted`, 
      n = "", o = `
          <meta property="fc:frame:button:1" content="Success!" />
        `;
    } catch (e) {
      console.error(e), r = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(s.metadata.frame.frameImageUrl)}&text=Something%20went%20wrong`, 
      n = "", o = `
          <meta property="fc:frame:button:1" content="Something went wrong. Please try again." />
        `;
    }
    break;

   default:
    r = s.metadata.frame.frameImageUrl, n = config().DEFAULT_URI + `/wtf/v1/contracts/${s._id}/frames/post_url?step=mint`, 
    o = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
  }
  m = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${r}" />
        <meta property="fc:frame:post_url" content="${n}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${o}
      </head>
    </html>`;
  e.setHeader("Content-Type", "text/html"), e.send(m);
}), app.get("/v1/frames/image", async (e, t) => {
  var {
    text: e,
    image: a
  } = e.query, e = await generateImageWithText({
    text: e,
    image: decodeURIComponent(a),
    type: "jpg"
  });
  t.setHeader("Content-Type", e.imageType), t.send(e.imageBuffer);
}), module.exports = {
  router: app
};