const express = require("express"), app = express.Router(), Sentry = require("@sentry/node"), {
  memcache,
  getHash
} = require("../connectmemcache"), {
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_CURSORS,
  DEFAULT_FILTER_NO_SYMBOL
} = require("../helpers/wallet"), CastHandle = require("../models/CastHandle")["CastHandle"], Account = require("../models/Account")["Account"], Metadata = require("../models/Metadata")["Metadata"], {
  prod,
  config
} = require("../helpers/registrar"), crypto = require("crypto"), {
  Pack,
  Player
} = require("../models/farcaster/tcg"), _RegistrarService = require("../services/RegistrarService")["Service"], Webhook = require("../models/Webhook")["Webhook"], wowTokenFactoryABI = require("../helpers/abi/wowTokenFactory")["wowTokenFactoryABI"], farTokenFactoryABI = require("../helpers/abi/farTokenFactory")["farTokenFactoryABI"], fidTokenFactoryABI = require("../helpers/abi/fidTokenFactory")["fidTokenFactoryABI"], wowTokenABI = require("../helpers/abi/wowToken")["wowTokenABI"], farTokenABI = require("../helpers/abi/farToken")["farTokenABI"], fidTokenABI = require("../helpers/abi/fidToken")["fidTokenABI"], BondingErc20 = require("../models/token/BondingErc20")["BondingErc20"], ethers = require("ethers"), padWithZeros = require("../helpers/number")["padWithZeros"], BondingErc20History = require("../models/token/BondingErc20History")["BondingErc20History"], axios = require("axios"), {
  Influencers,
  InfluencerAddresses,
  InfluencerTokens,
  TokenBreakdown,
  Transactions
} = require("../models/farcaster/analytics"), {
  getTokenPrice,
  NETWORK
} = require("../helpers/moralis"), {
  TIME_PERIODS,
  BASE_DEX_CONTRACTS_LOWERCASE
} = require("../schemas/farcaster/analytics"), {
  processFarTokenTradeEvent,
  processFarTokenTransferEvent,
  processFarTokenGraduatedEvent,
  MAX_PRIMARY_SUPPLY
} = require("../helpers/fartoken"), BondingErc20Transaction = require("../models/token/BondingErc20Transaction")["BondingErc20Transaction"], PRIMARY_MARKET_SUPPLY = 800000000n * 10n ** 18n, FARTOKEN_FACTORY_ADDRESS = "0x5c4743942072d2d0772b9887770e0943a67af6b4", WOW_FACTORY_ADDRESS = "0x997020e5f59ccb79c74d527be492cc610cb9fa2b", FID_FACTORY_ADDRESS = "0x43116248a582e417bbc3b6d271602bdb1218bf40", fetchIPFSMetadata = async r => {
  if (!r?.startsWith("ipfs://")) return null;
  try {
    var e = r.replace("ipfs://", "");
    return (await axios.get(`https://pinata.wieldcd.net/ipfs/${e}?pinataGatewayToken=` + process.env.PINATA_GATEWAY_TOKEN)).data;
  } catch (e) {
    return console.error(`Error fetching IPFS metadata for ${r}:`, e.message), null;
  }
};

function isValidSignatureForStringBody(e, r, a) {
  a = crypto.createHmac("sha256", a), a.update(e, "utf8"), e = a.digest("hex");
  return r === e;
}

async function isValidWebhook(e, r) {
  if ("production" === process.env.NODE_ENV) {
    var a = JSON.parse(r), t = await Webhook.findOne({
      webhookId: a.webhookId
    });
    if (!t) throw new Error("No webhook found for webhookId: " + a.webhookId);
    if (!isValidSignatureForStringBody(r, e.headers["x-alchemy-signature"], t.signingKey)) throw new Error(`Invalid signature for webhook! req.headers["x-alchemy-signature"]: ${e.headers["x-alchemy-signature"]} - req.body: ` + r);
  }
}

app.post("/nft-activity", express.raw({
  type: "application/json"
}), async (r, a) => {
  try {
    var e = r.body.toString("utf8"), t = (await isValidWebhook(r, e), JSON.parse(e));
    if (!t.event?.activity) throw new Error("No activity found in req.body.event webhook!");
    var o = new _RegistrarService("optimism"), n = new _RegistrarService(), s = new _RegistrarService("base");
    for (const y of t.event.activity) {
      var {
        contractAddress: i,
        erc721TokenId: d
      } = y, c = d?.toLowerCase(), l = y.toAddress?.toLowerCase();
      if (!c || !c.startsWith("0x")) throw new Error(`Invalid tokenId! Must start with 0x: ${c} for contractAddress: ` + i);
      if (!l || !l.startsWith("0x")) throw new Error(`Invalid owner! Must start with 0x: ${l} for tokenId: ` + c);
      if (![ prod().REGISTRAR_ADDRESS.toLowerCase(), prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase(), prod().BASE_REGISTRAR_ADDRESS.toLowerCase() ].includes(i.toLowerCase())) throw new Error("No valid registrar contract found for contractAddress: " + i);
      var u = await Metadata.findOne({
        uri: c
      }), p = i.toLowerCase() === prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase(), w = i.toLowerCase() === prod().BASE_REGISTRAR_ADDRESS.toLowerCase(), k = u?.domain || c, h = await CastHandle.findOne({
        tokenId: CastHandle.normalizeTokenId(c)
      }), f = p ? o : w ? s : n;
      let e = null;
      try {
        h?.expiresAt || (e = await f.expiresAt(k, {
          tokenId: c
        }));
      } catch (e) {
        console.error(`Error getting expiresAt for handle: ${k} on ` + (p ? "OP" : w ? "BASE" : "ETH"), e), 
        Sentry.captureException(e);
      }
      var A = await CastHandle.findOneAndUpdate({
        tokenId: CastHandle.normalizeTokenId(c)
      }, {
        owner: l.toLowerCase(),
        chain: p ? "OP" : w ? "BASE" : "ETH",
        handle: k,
        ...e ? {
          expiresAt: e
        } : {}
      }, {
        upsert: !0,
        new: !0
      });
      if (config().SHOULD_CREATE_PACKS && u?.domain) {
        try {
          await Promise.all([ memcache.delete("tcg:inventory:first-page:" + A.owner, {
            noreply: !0
          }), memcache.delete("tcg:packs:first-page:" + A.owner, {
            noreply: !0
          }) ]);
        } catch (e) {
          console.error(e);
        }
        var T, E = await Pack.findOne({
          handle: A._id
        });
        let e;
        e = p || w ? "Premium" : k.length <= 9 ? "Collector" : "Normal", E ? (E.handle = A._id, 
        E.type = e, await E.save()) : (await Pack.create({
          set: config().PACK_SET,
          type: e,
          handle: A._id
        }), (T = await Account.findByAddressAndChainId({
          address: l,
          chainId: 1
        })) && await Player.findOne({
          account: T._id
        }) && await A.setCastHandleMetadataForFarheroPacks(e));
      }
      console.log(`NFT Activity Webhook - Updated cast handle: ${k} to owner: ${l} on ` + (p ? "OP" : w ? "BASE" : "ETH"));
    }
    return a.status(200).send("NFT activity webhook received");
  } catch (e) {
    console.error("Error handling webhook:", e), Sentry.captureException(e, {
      extra: {
        rawBody: r.body?.toString("utf8")
      }
    }), a.status(500).send("Internal Server Error");
  }
}), app.post("/analytics-address-activity", express.raw({
  type: "application/json"
}), async (e, r) => {
  try {
    var a = e.body.toString("utf8"), t = (await isValidWebhook(e, a), JSON.parse(a));
    if (!t.event?.activity) throw new Error("No activity found in req.body.event webhook!");
    if ("BASE_MAINNET" !== t.event.network) return r.status(200).send("Webhook received but not on BASE_MAINNET");
    var o = t.event.activity.filter(e => "token" === e.category), n = [ ...new Set([ ...o.map(e => e.fromAddress.toLowerCase()), ...o.map(e => e.toAddress.toLowerCase()) ]) ], s = await InfluencerAddresses.find({
      address: {
        $in: n
      },
      chain: "BASE"
    });
    if (0 === s.length) return r.status(200).send("No influencer addresses found");
    var i = new Date();
    for (const w of o) if ([ "token", "external", "erc20" ].includes(w.category) && !w.erc721TokenId && !w.erc1155Metadata) {
      var d = BASE_DEX_CONTRACTS_LOWERCASE[w.fromAddress.toLowerCase()], c = BASE_DEX_CONTRACTS_LOWERCASE[w.toAddress.toLowerCase()];
      let e = !(!d && !c);
      e ? await Transactions.updateMany({
        hash: w.hash
      }, {
        $set: {
          isSwap: !0
        }
      }) : e = !!await Transactions.exists({
        hash: w.hash,
        isSwap: !0
      });
      const k = w.toAddress.toLowerCase(), h = w.fromAddress.toLowerCase();
      var l, u = w.hash + ":log:" + w.log.logIndex, p = s.find(e => e.address === k || e.address === h);
      p ? (l = !d && p.address !== h && "0x0000000000000000000000000000000000000000" !== h, 
      await Transactions.updateOne({
        uniqueId: u
      }, {
        $set: {
          fid: p.fid,
          blockNum: w.blockNum,
          uniqueId: u,
          hash: w.hash,
          from: h,
          to: k,
          value: w.value,
          asset: w.asset,
          category: l ? "airdrop" : "token" === w.category ? "erc20" : w.category,
          rawContract: {
            value: w.rawContract.rawValue,
            address: w.rawContract.address,
            decimal: w.rawContract.decimals
          },
          timestamp: i,
          chain: "BASE",
          isSwap: e
        }
      }, {
        upsert: !0
      })) : console.error(`No influencer found for address ${h} or ` + k);
    }
    r.status(200).send("Webhook received and processed");
  } catch (e) {
    console.error("Error handling webhook:", e), Sentry.captureException(e), r.status(500).send("Internal Server Error");
  }
}), app.post("/bonding-token-created", express.raw({
  type: "application/json"
}), async (r, a) => {
  try {
    var e = r.body.toString("utf8"), t = (await isValidWebhook(r, e), JSON.parse(e));
    if (!t.event?.data?.block?.logs) throw new Error("No logs found in req.body.event.data.block webhook!");
    if (![ "BASE_MAINNET", "OPT_MAINNET" ].includes(t.event.network)) return a.status(200).send("Webhook received but not on BASE_MAINNET or OPT_MAINNET");
    var o = t.event.data.block.logs, n = t.event.data.block.timestamp, s = parseInt(t.event.data.block.number);
    for (const F of o) try {
      var i, d, c, l, u, p, w, k, h, f, A, T, E, y, S, m, b, g, v, I, C, R = {
        ...F,
        blockNumber: s,
        transactionHash: F.transaction.hash
      }, _ = F.account.address.toLowerCase(), B = (_ === WOW_FACTORY_ADDRESS ? new ethers.utils.Interface(wowTokenFactoryABI) : _ === FID_FACTORY_ADDRESS ? new ethers.utils.Interface(fidTokenFactoryABI) : new ethers.utils.Interface(farTokenFactoryABI)).parseLog(R);
      [ "WowTokenCreated", "FarTokenCreated", "FIDTokenCreated" ].includes(B.name) && ({
        tokenCreator: i,
        platformReferrer: d,
        protocolFeeRecipient: c,
        bondingCurve: l,
        tokenURI: u,
        name: p,
        symbol: w,
        tokenAddress: k,
        poolAddress: h,
        allocatedSupply: f,
        fid: A
      } = B.args, T = F.transaction?.from?.address?.toLowerCase(), E = await fetchIPFSMetadata(u), 
      y = BondingErc20.findOneAndUpdate({
        tokenAddress: k.toLowerCase()
      }, {
        tokenCreator: i.toLowerCase(),
        platformReferrer: d.toLowerCase(),
        protocolFeeRecipient: c.toLowerCase(),
        bondingCurve: l.toLowerCase(),
        tokenURI: u,
        metadata: E,
        name: p,
        symbol: BondingErc20.cleanSymbol(w),
        poolAddress: h.toLowerCase(),
        chainId: _ === FID_FACTORY_ADDRESS ? 10 : 8453,
        factoryAddress: _,
        timestamp: new Date(1e3 * n),
        blockNumber: s,
        actualCreator: T,
        type: _ === WOW_FACTORY_ADDRESS ? "WOW" : _ === FID_FACTORY_ADDRESS ? "FIDTOKEN" : "FARTOKEN",
        lastStatsUpdate: new Date(1e3 * n),
        lastProcessedBlock: s,
        ..._ === FID_FACTORY_ADDRESS && {
          allocatedSupply: f.toString(),
          fid: parseInt(A || "0")
        }
      }, {
        upsert: !0,
        new: !0
      }), S = BondingErc20History.create({
        tokenAddress: k.toLowerCase(),
        timestamp: new Date(1e3 * n),
        blockNumber: s,
        txHash: F.transaction.hash,
        eventName: B.name,
        tokenCreator: i.toLowerCase(),
        platformReferrer: d.toLowerCase(),
        protocolFeeRecipient: c.toLowerCase(),
        bondingCurve: l.toLowerCase(),
        tokenURI: u,
        metadata: E,
        poolAddress: h.toLowerCase(),
        marketType: 0,
        marketCapInETH: "0",
        bondingCurveProgress: "0",
        totalSupply: "0",
        exchangeRate: "0",
        cumulativeTxCount: 0,
        cumulativeVolume: "0",
        holdersCount: 0,
        rawEventData: B.args
      }), m = Transactions.updateOne({
        uniqueId: F.transaction.hash
      }, {
        $set: {
          fid: i.toLowerCase(),
          blockNum: s,
          uniqueId: F.transaction.hash,
          hash: F.transaction.hash,
          from: ethers.constants.AddressZero,
          to: k.toLowerCase(),
          value: 0,
          asset: w,
          category: "erc20created",
          rawContract: {
            value: 0,
            address: k.toLowerCase(),
            decimal: 18
          },
          timestamp: new Date(),
          chain: _ === FID_FACTORY_ADDRESS ? "OPTIMISM" : "BASE",
          isSwap: !0,
          isFartoken: !0
        }
      }, {
        upsert: !0
      }), b = BondingErc20Transaction.updateOne({
        tokenAddress: k.toLowerCase()
      }, {
        $set: {
          tokenAddress: k.toLowerCase(),
          timestamp: new Date(1e3 * n),
          blockNumber: s,
          txHash: F.transaction.hash,
          type: "Create",
          from: ethers.constants.AddressZero,
          to: k.toLowerCase(),
          address: i.toLowerCase(),
          addressBalance: "0",
          tokenAmount: "0",
          amountInETH: "0",
          totalSupply: "0"
        }
      }, {
        upsert: !0
      }), g = getHash(`getBondingTokenTransactions:${k.toLowerCase()}:10:initial`), 
      v = getHash("getBondingTokens:initial:lastActivity"), I = getHash("getBondingTokens:initial:timestamp"), 
      C = getHash(`getBondingTokenHistory:${k.toLowerCase()}:5m`), await Promise.all([ y, S, m, b, memcache.delete(g, {
        noreply: !0
      }), memcache.delete(v, {
        noreply: !0
      }), memcache.delete(I, {
        noreply: !0
      }), memcache.delete(C, {
        noreply: !0
      }) ]), console.log("Created BondingErc20 for token: " + k));
    } catch (e) {
      console.error("Error processing log:", e), Sentry.captureException(e);
      continue;
    }
    a.status(200).send("Webhook processed successfully");
  } catch (e) {
    console.error("Error processing webhook:", e), Sentry.captureException(e, {
      extra: {
        rawBody: r.body?.toString("utf8")
      }
    }), a.status(500).send("Internal Server Error");
  }
}), app.post("/bonding-token-events", express.raw({
  type: "application/json"
}), async (r, a) => {
  try {
    var e = r.body.toString("utf8"), t = (await isValidWebhook(r, e), JSON.parse(e));
    if ("GRAPHQL" !== t.type) throw new Error("Unexpected webhook type: " + t.type);
    if (!t.event?.data?.block?.logs) throw new Error("No logs found in req.body.event.data.block webhook!");
    if (![ "BASE_MAINNET", "OPT_MAINNET" ].includes(t.event.network)) return a.status(200).send("Webhook received but not on BASE_MAINNET or OPT_MAINNET");
    var o = t.event.data.block.logs, n = parseInt(t.event.data.block.number), s = new Date(1e3 * t.event.data.block.timestamp);
    if (!Array.isArray(o)) throw new Error("Logs is not an array!");
    for (const p of o) {
      var i = {
        ...p,
        blockNumber: n,
        transactionHash: p.transaction?.hash
      }, d = p.account.address?.toLowerCase();
      if (d) {
        var c = await BondingErc20.findOne({
          tokenAddress: d
        });
        if (c) try {
          var l = ("WOW" === c.type ? new ethers.utils.Interface(wowTokenABI) : "FIDTOKEN" === c.type ? new ethers.utils.Interface(fidTokenABI) : new ethers.utils.Interface(farTokenABI)).parseLog(i), u = l.name;
          switch (u) {
           case "FIDTokenBuy":
           case "FIDTokenSell":
           case "FarTokenBuy":
           case "FarTokenSell":
           case "WowTokenBuy":
           case "WowTokenSell":
            await processFarTokenTradeEvent({
              tokenAddress: d,
              token: c,
              event: {
                ...i,
                transaction: {
                  blockNumber: t.event.data.block.number,
                  hash: i.transactionHash
                },
                event: u
              },
              eventName: u,
              decodedLog: l,
              blockTimestamp: s
            });
            break;

           case "FIDTokenTransfer":
           case "FarTokenTransfer":
           case "WowTokenTransfer":
            await processFarTokenTransferEvent({
              tokenAddress: d,
              token: c,
              event: {
                ...i,
                transaction: {
                  blockNumber: t.event.data.block.number,
                  hash: i.transactionHash
                }
              },
              decodedLog: l,
              blockTimestamp: s
            });
            break;

           case "FIDTokenMarketGraduated":
           case "FarTokenMarketGraduated":
           case "WowMarketGraduated":
            await processFarTokenGraduatedEvent({
              tokenAddress: d,
              event: {
                ...i,
                transaction: {
                  blockNumber: t.event.data.block.number,
                  hash: i.transactionHash
                }
              },
              blockTimestamp: s
            });
            break;

           default:
            Sentry.captureMessage("Unknown event in /bonding-token-events: " + u, {
              level: "error",
              extra: {
                enrichedLog: i,
                rawBody: e
              }
            });
          }
          (!c.lastProcessedBlock || n > c.lastProcessedBlock) && (c.lastStatsUpdate = s, 
          c.lastProcessedBlock = n, await c.save());
        } catch (e) {
          console.error(`Error processing event for token ${d}:`, e);
          continue;
        }
      } else Sentry.captureMessage("Missing token address in log:", {
        level: "error",
        extra: {
          enrichedLog: i,
          rawBody: e
        }
      });
    }
    a.status(200).send("Events processed successfully");
  } catch (e) {
    console.error("Error processing events:", e), Sentry.captureException(e, {
      extra: {
        rawBody: r.body?.toString("utf8")
      }
    }), a.status(500).send("Internal Server Error");
  }
}), module.exports = {
  router: app
};