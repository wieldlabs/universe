const Account = require("../../models/Account")["Account"], {
  Card,
  Player,
  Match,
  Pack,
  PlayableCard,
  MAX_FAVORITES,
  TRIGGER,
  EFFECT
} = require("../../models/farcaster/tcg"), Referral = require("../../models/Referral")["Referral"], ScoreService = require("../ScoreService")["Service"], _RegistrarService = require("../RegistrarService")["Service"], memcache = require("../../connectmemcache")["memcache"], mongoose = require("mongoose"), crypto = require("crypto"), getAddressPasses = require("../../helpers/farcaster-utils")["getAddressPasses"], CastHandle = require("../../models/CastHandle")["CastHandle"], config = require("../../helpers/registrar")["config"], Sentry = require("@sentry/node"), AccountInvite = require("../../models/AccountInvite")["AccountInvite"], _ScoreService = require("../ScoreService")["Service"], getLeaderboard = require("../../helpers/farcaster")["getLeaderboard"], getFarheroXpScoreType = require("../../helpers/farhero")["getFarheroXpScoreType"], _OpenseaService = require("../OpenseaService")["Service"], createGameCard = (e, a) => ({
  ...e.toObject(),
  ...a.toObject()
}), jsonClone = e => JSON.parse(JSON.stringify(e)), MAX_RETRIES = 3, hasXPasses = async (a, e) => {
  if ("number" != typeof e) throw new Error("count must be a number");
  if (e < 1) throw new Error("count must be greater than 0");
  let t = !1;
  try {
    var r = await getAddressPasses(a, !1);
    t = r.passes?.length >= e;
  } catch (e) {
    console.error("Cannot getAddressPasses!", a), t = !1;
  }
  return t;
};

class FarcasterTcgService {
  constructor() {
    this.scoreService = new ScoreService(), this.farpointsScoreType = "development" === process.env.NODE_ENV ? "beta" : "playground", 
    this.freeUnboxCost = 100, this.premiumUnboxCost = 1e3, this.freeUnboxItemId = "pack-normal", 
    this.premiumUnboxItemId = "pack-premium", this.referralRewardPerClaimCount = 10, 
    this.extraEnergyPerRound = 5, this.defaultReferralItemId = "pack-normal", this.referralItemUniqueIdToId = {
      "pack-normal": (process.env.NODE_ENV, "66b18d3434a946fdc1e2c224")
    }, this.RENTED_PACK_TIME = 12096e5, this.referralQuests = {
      "referral-5": {
        minReferralCount: 5,
        id: "referral-5",
        score: 5,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 5
        }
      },
      "referral-10": {
        minReferralCount: 10,
        id: "referral-10",
        score: 10,
        reward: {
          itemUniqueId: "farpoints",
          quantity: 100
        }
      },
      "referral-15": {
        minReferralCount: 15,
        id: "referral-15",
        score: 15,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 10
        }
      },
      "referral-25": {
        minReferralCount: 25,
        id: "referral-25",
        score: 25,
        reward: {
          itemUniqueId: "farpoints",
          quantity: 250
        }
      },
      "referral-50": {
        minReferralCount: 50,
        id: "referral-50",
        score: 50,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 10
        }
      },
      "referral-75": {
        minReferralCount: 75,
        id: "referral-75",
        score: 75,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 15
        }
      },
      "referral-100": {
        minReferralCount: 100,
        id: "referral-100",
        score: 100,
        reward: {
          itemUniqueId: "genesis-booster-p-t",
          quantity: 3
        }
      },
      "referral-200": {
        minReferralCount: 200,
        id: "referral-200",
        score: 200,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 15
        }
      },
      "referral-300": {
        minReferralCount: 300,
        id: "referral-300",
        score: 300,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 20
        }
      },
      "referral-400": {
        minReferralCount: 400,
        id: "referral-400",
        score: 400,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 25
        }
      },
      "referral-500": {
        minReferralCount: 500,
        id: "referral-500",
        score: 500,
        reward: {
          itemUniqueId: "genesis-booster-p-t",
          quantity: 5
        }
      },
      "referral-600": {
        minReferralCount: 600,
        id: "referral-600",
        score: 600,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 35
        }
      },
      "referral-700": {
        minReferralCount: 700,
        id: "referral-700",
        score: 700,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 50
        }
      },
      "referral-800": {
        minReferralCount: 800,
        id: "referral-800",
        score: 800,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 75
        }
      },
      "referral-900": {
        minReferralCount: 900,
        id: "referral-900",
        score: 900,
        reward: {
          itemUniqueId: "genesis-booster-n-t",
          quantity: 100
        }
      },
      "referral-1000": {
        minReferralCount: 1e3,
        id: "referral-1000",
        score: 1e3,
        reward: {
          itemUniqueId: "genesis-booster-p-t",
          quantity: 10
        }
      }
    }, this.unboxQuests = {}, this.MAX_SHOP_CARDS = 3, this.MAX_CARDS_IN_HAND = 4, 
    this.FAVORITE_ODDS = .1, this._BOT_PLAYER = null, this.MAX_FIELD_CARDS = 4, 
    this.DEBUG = "development" === process.env.NODE_ENV, this.SHOP_OPEN_SECONDS = 22, 
    this.OPPONENT_OPTIONS = [ "opp1", "opp2", "opp3", "opp4", "opp5" ], this.ARENA_OPTIONS = [ "arena1", "arena2", "arena3", "arena4", "arena5" ], 
    this.PACK_GRACE_PERIOD_SECONDS = Math.floor(Date.now() / 1e3) + 15552e3, this.INVENTORY_CACHE_KEY = "tcg:inventory:first-page", 
    this.PACKS_CACHE_KEY = "tcg:packs:first-page", this.CACHE_TTL = 10, this.PLAYER_STARTING_HEALTH = 10, 
    this.OVERLOAD_PER_PERIOD = 1e4, this.PERIOD_IN_DAYS = 7, this.OVERLOAD_MULTIPLIER = .1, 
    this.INTERNAL_INVITE_CODES = [ "projecteverest", "farquestloyalty", "base", "jcdenton", "frame" ], 
    this.INTERNAL_ACCOUNT_USERNAME = "jc", this.FARHERO_CHECK_PASSES_INVITE_CODE = "CheckPasses", 
    this.FARHERO_HANDLES_REQUIRED_FOR_INVITE = (process.env.NODE_ENV, 1), this.MAX_ROUNDS_BEFORE_DRAW = 15, 
    this.quests = {
      followWieldLabs: {
        id: "followWieldLabs",
        score: 100
      },
      likeWieldLabsLatest: {
        id: "likeWieldLabsLatest",
        score: 100
      },
      followTwitch: {
        id: "followTwitch",
        score: 100
      },
      followJcdenton: {
        id: "followJcdenton",
        score: 100
      },
      followNico: {
        id: "followNico",
        score: 100
      },
      followTg: {
        id: "followTg",
        score: 100
      },
      followDiscord: {
        id: "followDiscord",
        score: 100
      },
      followTgAnnouncement: {
        id: "followTgAnnouncement",
        score: 100
      },
      dotCast: {
        id: "dotCast",
        score: 200,
        check: async a => {
          let t = !1;
          try {
            var e = await getAddressPasses(a, !0);
            t = e.isHolder;
          } catch (e) {
            console.error("Cannot getAddressPasses!", a), t = !1;
          }
          return t;
        }
      },
      dotCast3: {
        id: "dotCast3",
        score: 300,
        check: e => hasXPasses(e, 3)
      },
      dotCast5: {
        id: "dotCast5",
        score: 500,
        check: e => hasXPasses(e, 5)
      },
      dotCast10: {
        id: "dotCast10",
        score: 1500,
        check: e => hasXPasses(e, 10)
      },
      dotCast15: {
        id: "dotCast15",
        score: 2e3,
        check: e => hasXPasses(e, 15)
      },
      dotCast20: {
        id: "dotCast20",
        score: 2500,
        check: e => hasXPasses(e, 20)
      },
      dotCast25: {
        id: "dotCast25",
        score: 7e3,
        check: e => hasXPasses(e, 25)
      },
      dotCast30: {
        id: "dotCast30",
        score: 8e3,
        check: e => hasXPasses(e, 30)
      },
      dotCast35: {
        id: "dotCast35",
        score: 9e3,
        check: e => hasXPasses(e, 35)
      },
      dotCast40: {
        id: "dotCast40",
        score: 1e4,
        check: e => hasXPasses(e, 40)
      },
      dotCast45: {
        id: "dotCast45",
        score: 11e3,
        check: e => hasXPasses(e, 45)
      },
      dotCast50: {
        id: "dotCast50",
        score: 12e3,
        check: e => hasXPasses(e, 50)
      },
      dotCast75: {
        id: "dotCast75",
        score: 15e3,
        check: e => hasXPasses(e, 75)
      },
      dotCast100: {
        id: "dotCast100",
        score: 2e4,
        check: e => hasXPasses(e, 100)
      },
      dotCast250: {
        id: "dotCast250",
        score: 3e4,
        check: e => hasXPasses(e, 250)
      },
      dotCast500: {
        id: "dotCast500",
        score: 4e4,
        check: e => hasXPasses(e, 500)
      },
      dotCast750: {
        id: "dotCast750",
        score: 5e4,
        check: e => hasXPasses(e, 750)
      },
      dotCast1000: {
        id: "dotCast1000",
        score: 1e5,
        check: e => hasXPasses(e, 1e3)
      }
    };
  }
  async getXp({
    context: e = null,
    address: a = null
  }) {
    var t;
    if (a || e) return t = new _ScoreService(), e && await e.account.populate("addresses"), 
    a = a || e.account.addresses[0].address?.toLowerCase(), t.getCommunityScore({
      address: a,
      bebdomain: getFarheroXpScoreType()
    });
    throw new Error("Address or context is required");
  }
  async awardXp({
    context: e = null,
    address: a = null,
    xp: t
  }) {
    if (!t) throw new Error("XP is required");
    var r;
    if (a || e) return r = new _ScoreService(), e && await e.account.populate("addresses"), 
    a = a || e.account.addresses[0].address?.toLowerCase(), r.addXP({
      address: a,
      type: getFarheroXpScoreType(),
      xp: t,
      overloadPerPeriod: this.OVERLOAD_PER_PERIOD,
      periodInDays: this.PERIOD_IN_DAYS,
      overloadMultiplier: this.OVERLOAD_MULTIPLIER
    });
    throw new Error("Address or context is required");
  }
  async getLeaderboard({
    limit: e = 25
  }) {
    return getLeaderboard({
      scoreType: getFarheroXpScoreType(),
      limit: e
    });
  }
  async getPlayerPosition({
    context: e
  }) {
    var a = new _ScoreService(), e = (await e.account.populate("addresses"), e.account.addresses[0].address?.toLowerCase());
    return a.getPosition({
      address: e,
      bebdomain: getFarheroXpScoreType()
    });
  }
  async _exponentialBackoff(e, a = MAX_RETRIES) {
    let t = 0;
    for (;t < a; ) try {
      return await e();
    } catch (e) {
      if (![ "MongoServerError", "VersionError" ].includes(e.name)) throw e;
      {
        if (++t >= a) throw e;
        const r = 100 * Math.pow(2, t);
        await new Promise(e => setTimeout(e, r));
      }
    }
  }
  async getBotPlayer() {
    return this._BOT_PLAYER || (this._BOT_PLAYER = await Player.findOne({
      isBot: !0
    }), this._BOT_PLAYER) || (this._BOT_PLAYER = new Player({
      account: null,
      isBot: !0,
      cards: [],
      favorites: []
    }), this._BOT_PLAYER.save()), this._BOT_PLAYER;
  }
  async _getTotalReferral(e) {
    var a = await memcache.get(`Referral:FARHERO:${e}:total:count`);
    return a ? a.value : (a = await Referral.countDocuments({
      account: e,
      isValid: !0,
      referralOrigin: "FARHERO"
    }), await memcache.set(`Referral:FARHERO:${e}:total:count`, a), a);
  }
  async _verifyHandleUnbox({
    handleId: e,
    type: a
  }, t) {
    e = await CastHandle.findById(e);
    if (!e) throw new Error("Invalid handle");
    await t.account.populate("addresses");
    t = t.account.addresses[0].address?.toLowerCase();
    if (e.owner.toLowerCase() !== t) throw new Error("Invalid handle owner");
    if (![ "normal", "premium", "collector" ].includes(a)) throw new Error("Invalid pack type");
    if ("premium" === a && "OP" !== e.chain && "BASE" !== e.chain) throw new Error("Premium packs can only be on OP or BASE");
    if ("collector" === a && (isNaN(e.handle?.length) || 9 < e.handle?.length)) throw new Error("Collector pack has invalid handle length!");
    t = e.expiresAt;
    if (!t) throw new Error("Unable to fetch expiration date for this handle");
    a = this.PACK_GRACE_PERIOD_SECONDS;
    if (parseInt(t) <= a) throw new Error("Handle expires in less than 3 months");
    return e;
  }
  async _randomUnbox({
    type: e = "normal",
    set: a,
    handleId: t
  }) {
    e = await Card.randomUnbox({
      type: e,
      set: a
    });
    if (await PlayableCard.findOne({
      handle: t
    })) throw new Error("A card is already assigned to this handle");
    a = await PlayableCard.create({
      card: e._id,
      wear: e.wear,
      handle: t,
      foil: e.foil
    });
    return {
      ...e,
      playableCard: a
    };
  }
  async _randomTrialUnbox({
    type: e = "normal",
    set: a,
    playerId: t,
    expiresAt: r
  }) {
    e = await Card.randomUnbox({
      type: e,
      set: a
    }), a = await PlayableCard.create({
      card: e._id,
      wear: e.wear,
      handle: null,
      foil: e.foil,
      rentedTo: t,
      expiresAt: r
    });
    return {
      ...e,
      playableCard: a
    };
  }
  async _unboxCardWithHandle({
    player: e,
    set: a,
    handleId: t
  }, r) {
    var s = await mongoose.startSession();
    s.startTransaction();
    try {
      var o = await Pack.findOne({
        handle: t,
        openedAt: null
      }).session(s);
      if (!o) throw new Error("Valid unopened FarPack not found");
      var n = o.type.toLowerCase(), i = await this._verifyHandleUnbox({
        handleId: t,
        type: n
      }, r);
      const {
        playableCard: l,
        ...c
      } = await this._randomUnbox({
        player: e,
        type: n,
        set: a,
        handleId: t
      });
      o.openedAt = new Date(), o.openedCard = l._id, await o.save({
        session: s
      }), await r.account.populate("addresses");
      var d = r.account.addresses[0].address?.toLowerCase();
      i.displayItemId = c._id, i.displayMetadata = {
        name: c.name,
        image: c.image,
        rarity: c.rarity,
        wear: l.wear,
        foil: l.foil,
        displayType: "farhero",
        description: "Play FarHero Alpha on https://far.quest/hero, the epic Farcaster trading card game!"
      }, i.unsyncedMetadata = !0, await i.save({
        session: s
      }), await s.commitTransaction(), await Promise.all([ memcache.delete(this.INVENTORY_CACHE_KEY + ":" + d, {
        noreply: !0
      }), memcache.delete(this.PACKS_CACHE_KEY + ":" + d, {
        noreply: !0
      }) ]);
      try {
        new _OpenseaService({
          apiKey: process.env.OPENSEA_API_KEY
        }).refreshHandle(i);
      } catch (e) {
        Sentry.captureException(e), console.error(`Error refreshing handle ${i.handle} in _unboxCardWithHandle!`);
      }
      return {
        card: c,
        pack: o
      };
    } catch (e) {
      throw await s.abortTransaction(), new Error("Invalid handle unbox: " + e.message);
    } finally {
      await s.endSession();
    }
  }
  async convertHandlesToPacks(e, a) {
    try {
      await a.account.populate("addresses");
      var t = a.account.addresses[0].address?.toLowerCase(), r = this.PACK_GRACE_PERIOD_SECONDS, s = await CastHandle.find({
        owner: t,
        expiresAt: {
          $gt: r
        }
      }), o = await Player.findOne({
        account: a.accountId || a.account?._id
      });
      if (!o) throw new Error("Player not found");
      var n = [];
      for (const l of s) if (!l.displayItemId) {
        let e;
        e = "OP" === l.chain || "BASE" === l.chain ? "Premium" : l.handle?.length <= 9 ? "Collector" : "Normal", 
        n.push(l.setCastHandleMetadataForFarheroPacks(e));
      }
      var i = !o.dropClaimed, d = (o.dropClaimed = !0, [ ...n, o.save() ]);
      return i && (d.push(this._giveRentedPacksToPlayer({
        player: o,
        packType: "normal",
        quantity: 2
      })), d.push([ this._giveRentedPacksToPlayer({
        player: o,
        packType: "premium",
        quantity: 1
      }) ])), await Promise.all(d), await Promise.all([ memcache.delete(this.INVENTORY_CACHE_KEY + ":" + t, {
        noreply: !0
      }), memcache.delete(this.PACKS_CACHE_KEY + ":" + t, {
        noreply: !0
      }) ]), {
        convertedHandles: s.length
      };
    } catch (e) {
      throw console.error("Error during handle conversion:", e), new Error("Failed to upgrade handles to packs: " + e.message);
    }
  }
  async _unboxCardWithTrialPack({
    player: e,
    set: a,
    packId: t
  }, r) {
    var s = await mongoose.startSession();
    s.startTransaction();
    try {
      var o = await Pack.findById(t).session(s);
      if (!o || !o.rentedTo.equals(e._id)) throw new Error("Invalid Trial FarPack");
      var n = o.type.toLowerCase();
      if (o.openedAt) throw new Error("Trial FarPack already opened");
      if (o.expiresAt && o.expiresAt < Date.now()) throw new Error("Trial FarPack expired");
      var i = await this._randomTrialUnbox({
        player: e,
        type: n,
        set: a,
        expiresAt: new Date(Date.now() + this.RENTED_PACK_TIME),
        playerId: e._id
      }), d = (o.openedAt = new Date(), o.openedCard = i.playableCard._id, await o.save({
        session: s
      }), await s.commitTransaction(), await r.account.populate("addresses"), r.account.addresses[0].address?.toLowerCase());
      return await Promise.all([ memcache.delete(this.INVENTORY_CACHE_KEY + ":" + d, {
        noreply: !0
      }), memcache.delete(this.PACKS_CACHE_KEY + ":" + d, {
        noreply: !0
      }) ]), {
        card: i,
        pack: o
      };
    } catch (e) {
      throw await s.abortTransaction(), new Error("Invalid trial pack unbox: " + e.message);
    } finally {
      await s.endSession();
    }
  }
  async unboxCard({
    type: e = "normal",
    method: a = "handle",
    set: t,
    handleId: r,
    packId: s
  }, o) {
    var n = o.account;
    if (!n) throw new Error("Account not found");
    n = await Player.findOne({
      account: n._id
    });
    if (!n) throw new Error("Player not found");
    if ("handle" === a) {
      if (r) return this._unboxCardWithHandle({
        player: n,
        type: e,
        set: t,
        handleId: r
      }, o);
      throw new Error("No pack handle provided");
    }
    if ("trial" !== a) throw new Error("Invalid unbox method!");
    if (s) return this._unboxCardWithTrialPack({
      player: n,
      type: e,
      set: t,
      packId: s
    }, o);
    throw new Error("No trial pack ID provided");
  }
  async getGameState(e) {
    const a = e["account"];
    await a.populate("addresses");
    var t = a.addresses[0].address?.toLowerCase(), [ e, t, r, s ] = await Promise.all([ Player.findOne({
      account: a._id
    }).then(async e => {
      return e || new Player({
        account: a._id
      }).save();
    }), this._getTotalReferral(a._id), this.getXp({
      context: e
    }), getAddressPasses(t, !1) ]);
    return {
      player: e,
      totalRefCount: t,
      xp: r,
      totalPass: s.passes?.length
    };
  }
  getXpForOpponent(e) {
    switch (e) {
     case "opp1":
      return 20;

     case "opp2":
      return 40;

     case "opp3":
      return 60;

     case "opp4":
      return 80;

     case "opp5":
      return 100;
    }
    throw new Error("Invalid bot opponent: " + e);
  }
  async _removeExpiredFavorites(e) {
    const t = await PlayableCard.find({
      _id: {
        $in: e.favorites
      }
    });
    return e.favorites = e.favorites.filter(a => t.some(e => e._id.equals(a) && (e.expiresAt > new Date() || !e.expiresAt))), 
    e.save();
  }
  async addFavorite(e, a) {
    if (!e) throw new Error("Player not found");
    if (!a) throw new Error("Playable card ID not found");
    if ((e = await this._removeExpiredFavorites(e)).favorites.push(a), e.favorites.length > MAX_FAVORITES) throw new Error("Player has too many favorites");
    return e.save();
  }
  async removeFavorite(e, a) {
    return (e = await this._removeExpiredFavorites(e)).favorites = e.favorites.filter(e => !e.equals(a)), 
    e.save();
  }
  async _getFavorites(e) {
    return e = await this._removeExpiredFavorites(e), Promise.all(e.favorites.map(e => PlayableCard.findById(e)));
  }
  async startMatch({
    players: e,
    isBot: a = !1,
    botOpponent: t = null
  }) {
    if (!e) throw new Error("At least 1 Player is required: " + e);
    if (e.some(e => !e)) throw new Error("Player not found");
    await Promise.all(e.map(e => this._removeExpiredFavorites(e)));
    var r = await Promise.all(e.map(e => this._getFavorites(e)));
    for (const o of await Match.find({
      players: {
        $in: e.map(e => e._id)
      },
      endTime: {
        $exists: !1
      }
    })) for (const n of e) o.players.some(e => e.equals(n._id)) && await this.quitMatch({
      match: o,
      player: n
    });
    if (!a) throw new Error("Non-bot matches are not supported!");
    var s = await this.getBotPlayer();
    e.push(s), r.push([]);
    const o = new Match({
      players: e.map(e => e._id),
      playerFavorites: r,
      isBotMatch: a,
      botDifficulty: 100,
      startTime: new Date(),
      playersHealthStart: e.map(() => this.PLAYER_STARTING_HEALTH),
      playersRewards: e.map(() => []),
      rounds: [],
      gameCards: [],
      botOpponent: this.OPPONENT_OPTIONS.includes(t) ? t : this.OPPONENT_OPTIONS[crypto.randomInt(this.OPPONENT_OPTIONS.length)],
      arena: this.ARENA_OPTIONS[crypto.randomInt(this.ARENA_OPTIONS.length)]
    });
    switch (o.botOpponent) {
     case "opp1":
      o.botDifficulty = 20;
      break;

     case "opp2":
      o.botDifficulty = 40;
      break;

     case "opp3":
      o.botDifficulty = 60;
      break;

     case "opp4":
      o.botDifficulty = 80;
      break;

     case "opp5":
      o.botDifficulty = 100;
      break;

     default:
      throw new Error("Invalid bot opponent: " + o.botOpponent);
    }
    o.rounds.push({
      actions: [],
      start: new Date(),
      shopDeadline: new Date(Date.now() + 1e3 * this.SHOP_OPEN_SECONDS),
      end: null,
      number: o.rounds.length,
      battleAcknowledgement: e.map(e => e.isBot),
      state: "Shop"
    }), o.rounds[o.rounds.length - 1].actions.push({
      player: e[0],
      type: "InitializeRound",
      time: new Date(),
      cost: 0,
      playersHealth: o.playersHealthStart,
      playersEnergy: e.map(() => o.rounds.length + this.extraEnergyPerRound),
      playersHand: e.map(() => Array.from({
        length: this.MAX_CARDS_IN_HAND
      }, () => -1)),
      playersField: e.map(() => Array.from({
        length: this.MAX_FIELD_CARDS
      }, () => -1)),
      playersShop: e.map(() => []),
      gameCardStats: []
    }), o.tick++, await o.save();
    s = o, s = await this.addAction({
      match: s,
      player: e[0],
      actionType: "DrawCards"
    });
    return s = await this.addAction({
      match: s,
      player: e[1],
      actionType: "DrawCards"
    }), s = await this.addAction({
      match: s,
      player: e[0],
      actionType: "RefreshShop"
    }), await this.addAction({
      match: s,
      player: e[1],
      actionType: "RefreshShop"
    });
  }
  async drawRandomMatchCards({
    match: e,
    player: a,
    limit: t = 1,
    shopCards: r = !1
  }) {
    if (!e) throw new Error("Match not found");
    if (!a) throw new Error("Player not found");
    if (!e.players.some(e => e.equals(a._id))) throw new Error("Player is not in the match");
    var s = [], o = await Promise.all(e.playerFavorites[e.players.findIndex(e => e.equals(a._id))].map(e => PlayableCard.findById(e))), n = (r && crypto.randomInt(MAX_FAVORITES) < o.length && (r = o[crypto.randomInt(o.length)], 
    o = await Card.findById(r.card)) && s.push(createGameCard(o, r)), await Card.find());
    let i = {
      Common: 50,
      Rare: 30,
      "Super-Rare": 15,
      "Ultra-Rare": 4,
      Legendary: 1,
      Mythic: .1
    };
    a.isBot && e.botDifficulty && (o = e.botDifficulty / 100, i = {
      Common: 50 - 50 * o,
      Rare: 30 - 30 * o,
      "Super-Rare": 15 + 15 * o,
      "Ultra-Rare": 4 + 4 * o,
      Legendary: 1 + o,
      Mythic: .1 + .1 * o
    });
    for (var d = Object.values(i).reduce((e, a) => e + a, 0); s.length < t; ) {
      var l, c, h = Math.random() * d;
      let e = 0, a;
      for ([ l, c ] of Object.entries(i)) if (h <= (e += c)) {
        a = l;
        break;
      }
      var p = n.filter(e => e.rarity === a);
      0 < p.length && (p = p[crypto.randomInt(p.length)], s.push(createGameCard(p, new PlayableCard({
        card: p._id,
        wear: (crypto.randomInt(1e9) / 1e9).toFixed(50),
        foil: [ "Super-Rare", "Ultra-Rare", "Legendary", "Mythic" ].includes(p.rarity) ? crypto.randomInt(100) < 5 ? "Standard" : crypto.randomInt(100) < 2 ? "Prize" : "None" : "None"
      }))));
    }
    return s;
  }
  async advanceMatch({
    match: h,
    player: p
  }) {
    if (!h) throw new Error("Match not found");
    if (!p) throw new Error("Player not found");
    if (h.players.some(e => e.equals(p._id))) return this._exponentialBackoff(async () => {
      var a = await mongoose.startSession();
      a.startTransaction();
      try {
        var e = (h = await Match.findById(h._id)).players.findIndex(e => e.equals(p._id)), t = h.rounds[h.rounds.length - 1];
        const l = t.actions[t.actions.length - 1];
        var r = await Player.find({
          _id: {
            $in: h.players
          }
        }).session(a), s = (h.rounds[h.rounds.length - 1].battleAcknowledgement[e] = !0, 
        h.rounds[h.rounds.length - 1].battleAcknowledgement.every(e => e));
        if (s) if (-1 !== l.playersHealth.findIndex(e => e <= 0) || h.rounds.length > this.MAX_ROUNDS_BEFORE_DRAW) {
          var o, n, i, d = h.players.filter((e, a) => 0 < l.playersHealth[a] && h.rounds.length <= this.MAX_ROUNDS_BEFORE_DRAW);
          h.winners = d, h.endTime = new Date();
          for (const c of d) {
            const p = await Player.findById(c);
            p.isBot || (await (o = await Account.findById(p.account)).populate("addresses"), 
            n = o?.addresses[0]?.address, i = await this.awardXp({
              address: n,
              xp: this.getXpForOpponent(h.botOpponent)
            }), h.playersRewards[e].push({
              type: "xp",
              amount: i
            }));
          }
        } else h.rounds.push({
          actions: [],
          start: new Date(),
          shopDeadline: new Date(Date.now() + 1e3 * this.SHOP_OPEN_SECONDS),
          end: null,
          number: h.rounds.length,
          battleAcknowledgement: r.map(e => e.isBot),
          state: "Shop"
        }), h.rounds[h.rounds.length - 1].actions.push({
          player: p,
          type: "InitializeRound",
          time: new Date(),
          cost: 0,
          playersHealth: l.playersHealth,
          playersEnergy: r.map(() => h.rounds.length + this.extraEnergyPerRound),
          playersHand: l.playersHand,
          playersField: l.playersField,
          playersShop: l.playersShop,
          gameCardStats: l.gameCardStats
        });
        return h.tick++, await h.save({
          session: a
        }), await a.commitTransaction(), h;
      } catch (e) {
        throw await a.abortTransaction(), e;
      } finally {
        a.endSession();
      }
    });
    throw new Error("Player is not in the match");
  }
  async syncMatch({
    match: e
  }) {
    let a = e;
    if (await memcache.get(`Match:sync:${a._id}:lastSync`)) return a;
    if (await memcache.set(`Match:sync:${a._id}:lastSync`, 1, {
      lifetime: 2
    }), !a) throw new Error("Match not found");
    if (a.endTime) return a;
    var t = await mongoose.startSession();
    t.startTransaction();
    try {
      if (!a.endTime && a.startTime < new Date(Date.now() - 18e5)) a.endTime = new Date(), 
      a.tick++, await a.save({
        session: t
      }); else {
        var r, s = a.rounds[a.rounds.length - 1];
        if (a.isBotMatch && "Shop" === s.state && new Date() <= s.shopDeadline) {
          const u = (await Player.find({
            _id: {
              $in: a.players
            }
          }).session(t)).filter(e => e.isBot)[0];
          let e = 0;
          for (;;) {
            if (10 < e++) throw new Error("Bot took too long to make a move");
            var o = a.rounds[a.rounds.length - 1];
            const y = o.actions[o.actions.length - 1];
            var n = a.players.findIndex(e => e.equals(u._id));
            const w = y.playersEnergy[n];
            if (o.battleAcknowledgement[n] || (o.battleAcknowledgement[n] = !0, 
            a.tick++, await a.save({
              session: t
            })), w <= 0) break;
            var i = y.playersHand[n].findIndex(e => -1 !== e && y.gameCardStats[e].cost <= w);
            if (-1 === i) {
              var d = y.playersShop[n].findIndex(e => -1 !== e && y.gameCardStats[e].cost <= w), l = y.playersShop[n][d], c = y.playersShop[n].filter(e => -1 !== e).length, h = y.playersHand[n].filter(e => -1 !== e).length;
              -1 !== d && h < this.MAX_CARDS_IN_HAND ? a = await this.addAction({
                match: a,
                player: u,
                actionType: "PurchaseCard",
                targetCardIdx: l,
                session: t
              }) : 0 === c && (a = await this.addAction({
                match: a,
                player: u,
                actionType: "RefreshShop",
                session: t
              }));
              break;
            }
            var p = y.playersField[n].findIndex(e => -1 === e);
            if (-1 === p) break;
            a = await this.addAction({
              match: a,
              player: u,
              actionType: "PlayCard",
              sourceCardIdx: i,
              targetCardIdx: p,
              session: t
            });
          }
        } else a.isBotMatch && "Ended" !== s.state && ("Shop" === s.state && (a.rounds[a.rounds.length - 1].state = "Battle", 
        a.tick++, await a.save({
          session: t
        })), r = await Player.findOne({
          _id: {
            $in: a.players
          }
        }).session(t), a = await this.addAction({
          match: a,
          player: r,
          actionType: "AutoBattle",
          sourceCardIdx: -1,
          targetCardIdx: -1,
          session: t,
          autoBattle: !0
        }));
      }
      return await t.commitTransaction(), t.endSession(), a;
    } catch (e) {
      throw await t.abortTransaction(), t.endSession(), e;
    }
  }
  async addAction({
    match: b,
    player: O,
    targetPlayer: D = null,
    sourceCardIdx: k = -1,
    targetCardIdx: F = -1,
    actionType: x,
    session: N = null,
    autoBattle: q = !1
  }) {
    if (!O) throw new Error("Player not found");
    if (b.players.some(e => e.equals(O._id))) return this._exponentialBackoff(async () => {
      let a = null;
      N || (a = await mongoose.startSession(), (N = a).startTransaction(), b = await Match.findById(b._id));
      try {
        const S = b.players.findIndex(e => e.equals(O._id));
        var t = D ? b.players.findIndex(e => e.equals(D._id)) : -1;
        let r = b.rounds[b.rounds.length - 1], s = r.actions[r.actions.length - 1];
        if ("PurchaseCard" === x) {
          if (s.playersEnergy[S] <= 0) throw new Error("Player has used all their energy for the round");
          if ("Shop" !== r.state) throw new Error("Cannot purchase card when not in the shop state!");
          if (s.playersHand[S].filter(e => -1 !== e).length >= this.MAX_CARDS_IN_HAND) throw new Error("Cannot purchase card when hand is full");
          if (-1 === F || void 0 === F || !s.playersShop[S].includes(F)) throw new Error("Card not found in player's shop");
          const v = s.playersShop[S].findIndex(e => e === F);
          if (-1 === v || void 0 === v) throw new Error("Card not found at a valid position in player's shop");
          var e = s.gameCardStats[F];
          if (!e) throw new Error("Card not found in match");
          if (e.cost > s.playersEnergy[S]) throw new Error("Player does not have enough energy to buy the card");
          var o = {
            ...jsonClone(s),
            player: O?._id || null,
            source: -1,
            target: F,
            type: x,
            time: new Date(),
            cost: e.cost
          }, n = s.playersHand[S].findIndex(e => -1 === e);
          o.playersHand[S][n] = F, o.playersShop[S] = o.playersShop[S].filter((e, a) => a !== v), 
          o.playersEnergy[S] -= e.cost, r.actions.push(o);
        } else if ("DrawCards" == x) {
          if (1 !== b.rounds.length) throw new Error("Cannot do DrawCards after the first round");
          var i = await this.drawRandomMatchCards({
            match: b,
            player: O,
            limit: this.MAX_CARDS_IN_HAND,
            session: N
          });
          const A = {
            ...jsonClone(s),
            player: O._id,
            source: -1,
            target: -1,
            type: "DrawCards",
            time: new Date(),
            cost: 0,
            gameCardStats: [ ...s.gameCardStats, ...i.map(e => e.stats) ]
          };
          b.gameCards.push(...i), i.forEach((e, a) => {
            A.playersHand[S][a] = b.gameCards.indexOf(e);
          }), r.actions.push(A);
        } else if ("RefreshShop" === x) {
          if ("Shop" !== r.state) throw new Error("Cannot refresh shop when not in the shop state!");
          if (r.actions.some(e => "RefreshShop" === e.type && e.player.equals(O._id))) throw new Error("Cannot refresh shop twice in a row");
          var d = await this.drawRandomMatchCards({
            match: b,
            player: O,
            limit: this.MAX_SHOP_CARDS,
            session: N,
            shopCards: !0
          }), l = {
            ...jsonClone(s),
            player: O._id,
            source: -1,
            target: -1,
            type: "RefreshShop",
            time: new Date(),
            cost: 0,
            gameCardStats: [ ...s.gameCardStats, ...d.map(e => e.stats) ]
          };
          b.gameCards.push(...d), l.playersShop[S] = [ ...d.map(e => b.gameCards.indexOf(e)) ], 
          r.actions.push(l);
        } else if ("PlayCard" === x) {
          if ("Shop" !== r.state) throw new Error("Cannot play card when not in the shop state!");
          const I = s.playersHand[S][k];
          if (-1 === I || void 0 === I) throw new Error("Card not found in hand");
          var c = s.gameCardStats[I];
          if (c.cost > s.playersEnergy[S]) throw new Error("Player does not have enough energy to play the card");
          const P = {
            ...jsonClone(s),
            player: O._id,
            source: k,
            target: F,
            type: x,
            time: new Date(),
            cost: c.cost
          }, R = (P.playersHand[S][k] = -1, P.playersField[S][F] = I, P.playersEnergy[S] -= c.cost, 
          this._applyCardAbilities({
            match: b,
            action: P,
            attackerIndex: S,
            defenderIndex: -1,
            attackerCard: I,
            defenderCard: -1,
            trigger: TRIGGER.Summon
          }), b.gameCards[I]);
          let t = 0;
          P.playersField[S].forEach(e => {
            var a;
            -1 === e || e === I || (a = b.gameCards[e]).class !== R.class && a.family !== R.family || (P.gameCardStats[e].health += 1, 
            t++);
          }), 0 < t && (P.gameCardStats[I].health += t), r.actions.push(P);
        } else if ("CardAttack" === x) {
          if ("Battle" !== r.state) throw new Error("Cannot attack when not in the battle state!");
          if (!q) throw new Error("Cannot attack manually when auto-battling");
          var h = s.playersField[S][k];
          if (-1 === h || void 0 === h) throw new Error(`[PlayCard]: Source card not found in field (playerIndex=${S}, sourceCardIdx=${k})`);
          let e = -1;
          if (-1 === F) {
            if (0 !== s.playersField[t].filter(e => -1 !== e).length) throw new Error("Opponent must have no cards on the field for a direct attack!");
          } else if (-1 === (e = s.playersField[t][F]) || void 0 === e) throw new Error(`[PlayCard]: Target card not found in field (playerIndex=${t}, targetCardIdx=${F})`);
          var p = {
            ...jsonClone(s),
            player: O._id,
            source: k,
            target: F,
            type: x,
            time: new Date(),
            cost: 0
          }, u = p.gameCardStats[h], y = p.gameCardStats[e];
          -1 === e ? (p.playersHealth[t] -= u.attack, p.playersHealth[t] = Math.max(p.playersHealth[t], 0)) : (u.attack >= y.health ? (p.playersField[t][F] = -1, 
          p.gameCardStats[e].health = 0) : p.gameCardStats[e].health -= u.attack, 
          p.gameCardStats[h].health = Math.max(p.gameCardStats[h].health - y.attack, 0), 
          0 === p.gameCardStats[h].health && (p.playersField[S][k] = -1)), this._applyCardAbilities({
            match: b,
            action: p,
            attackerIndex: S,
            defenderIndex: t,
            attackerCard: h,
            defenderCard: e
          }), r.actions.push(p);
        } else {
          if ("AutoBattle" !== x) throw new Error("Invalid action type: " + x);
          {
            if (!q) throw new Error("Cannot auto-battle manually");
            if (r.actions.find(e => "AutoBattle" === e.type && e.player === O._id)) throw new Error("Cannot auto-battle twice in a row");
            if ("Battle" !== r.state) throw new Error("Cannot auto-battle when not in the battle state!");
            var w = {
              ...jsonClone(s),
              player: O._id,
              source: -1,
              target: -1,
              type: x,
              time: new Date(),
              cost: 0
            };
            r.actions.push(w), await Player.find({
              _id: {
                $in: b.players
              }
            }).session(N);
            const T = {};
            let a = crypto.randomInt(2), t = 1 - a, e = 0;
            for (;;) {
              if (25 < e++) throw new Error("AutoBattle exceeded maximum iterations");
              var f = s.playersField[0].filter(e => -1 !== e && !T[e]), m = s.playersField[1].filter(e => -1 !== e && !T[e]);
              if (0 === f.length && 0 === m.length) break;
              var C = s.playersField[a].filter(e => -1 !== e && !T[e]);
              if (0 === C.length) {
                if (a = 1 - a, t = 1 - a, 0 === s.playersField[a].filter(e => -1 !== e && !T[e]).length) break;
              } else {
                const k = s.playersField[a].indexOf(C[0]);
                var E, g = s.playersField[t], _ = g.filter(e => -1 !== e);
                let e = -1;
                e = 0 < _.length ? (E = crypto.randomInt(_.length), g.indexOf(_[E])) : -1;
                try {
                  b = await this.addAction({
                    match: b,
                    player: b.players[a],
                    targetPlayer: b.players[t],
                    sourceCardIdx: k,
                    targetCardIdx: e,
                    actionType: "CardAttack",
                    session: N,
                    autoBattle: !0
                  }), T[C[0]] = !0, r = b.rounds[b.rounds.length - 1], s = r.actions[r.actions.length - 1];
                } catch (e) {
                  throw console.error("Error during auto-battle:", e), e;
                }
                t = 1 - (a = t);
              }
            }
            b.rounds[b.rounds.length - 1].state = "Ended";
          }
        }
        return b.tick++, await b.save({
          session: N
        }), a && (await N.commitTransaction(), N.endSession()), b;
      } catch (e) {
        throw a && (await N.abortTransaction(), N.endSession()), e;
      }
    }, N ? 1 : MAX_RETRIES);
    throw new Error("Player is not in the match");
  }
  async quitMatch({
    match: e,
    player: t
  }) {
    return this._exponentialBackoff(async () => {
      e = await Match.findById(e._id);
      var a = await mongoose.startSession();
      a.startTransaction();
      try {
        if (!t) throw new Error("Player not found");
        if (!e) throw new Error("Match not found");
        if (e.players.some(e => e.equals(t._id))) return e.endTime || ((e = await Match.findById(e._id)).endTime = new Date(), 
        e.playersQuitted = e.playersQuitted || [], e.playersQuitted.push(t._id), 
        e.tick++, await e.save({
          session: a
        }), await a.commitTransaction()), e;
        throw new Error("Player is not in the match");
      } catch (e) {
        throw await a.abortTransaction(), e;
      } finally {
        a.endSession();
      }
    });
  }
  async getAllCards() {
    return {
      cards: await Card.find(),
      unboxingOdds: Card.getUnboxingOdds()
    };
  }
  async _giveRentedPacksToPlayer({
    player: e,
    packType: a = "normal",
    quantity: t = 1
  }) {
    a = "premium" === a ? "Premium" : "Normal", t = Array(t).fill({
      set: config().PACK_SET,
      type: a,
      handle: null,
      rentedTo: e._id,
      expiresAt: new Date(Date.now() + this.RENTED_PACK_TIME)
    });
    return await Pack.insertMany(t), e;
  }
  async buyRentedPack({
    packType: e = "normal",
    quantity: a = 1
  }, t) {
    var r = this.farpointsScoreType, s = (await t.account.populate("addresses"), 
    t.account.addresses[0].address.toLowerCase()), o = await this.scoreService.getCommunityScore({
      address: s,
      bebdomain: r
    }), n = "premium" === e ? this.premiumUnboxCost : this.freeUnboxCost;
    if (!a || a < 1 || isNaN(parseInt(a))) throw new Error("Invalid quantity to rent FarPacks!");
    if (!o || o < n * parseInt(a)) throw new Error("Not enough score to rent FarPacks!");
    try {
      var i, d, l = t.account._id || t.account, c = await Player.findOne({
        account: l
      });
      if (c) return [ i, d ] = await Promise.all([ this.scoreService.setScore({
        address: s,
        scoreType: r,
        modifier: -(n * parseInt(a))
      }), this._giveRentedPacksToPlayer({
        player: c,
        packType: e,
        quantity: a
      }) ]), await memcache.delete(this.PACKS_CACHE_KEY + ":" + s, {
        noreply: !0
      }), {
        player: d,
        newScore: i
      };
      throw new Error("Player not found");
    } catch (e) {
      throw console.error("Error during FarPack buying :", e), new Error("Failed to claim FarPack");
    }
  }
  async claimReferralReward(e) {
    var a, t, e = e.account._id || e.account, r = await this._getTotalReferral(e), e = await Player.findOne({
      account: e
    });
    if (e) return 0 == (a = r - (r = e.appliedReferralCount)) ? {
      unclaimedItemCount: 0,
      usedReferralCount: 0
    } : (t = (a = Math.floor(a / this.referralRewardPerClaimCount)) * this.referralRewardPerClaimCount, 
    await this._giveRentedPacksToPlayer({
      player: e,
      packType: "normal",
      quantity: a
    }), e.appliedReferralCount = r + t, await e.save(), {
      unclaimedItemCount: a,
      usedReferralCount: t
    });
    throw new Error("Player not found");
  }
  async completeQuest(s, o) {
    const n = await mongoose.startSession();
    try {
      await n.withTransaction(async () => {
        var e = await Player.findOne({
          account: o.account._id
        }).session(n);
        if (e.quests && e.quests[s]) throw new Error("Quest already completed");
        var a, t = this.quests[s];
        if (!t) throw new Error("Quest not found");
        let r = !0;
        if (await o.account.populate("addresses"), t.check && (a = o.account.addresses[0].address?.toLowerCase(), 
        r = await t.check(a)), !r) throw new Error("Cannot complete quest");
        e.quests || (e.quests = {}), e.quests = {
          ...e.quests,
          [s]: !0
        }, await e.save({
          session: n
        }), await this.scoreService.setScore({
          address: o.account.addresses[0].address,
          scoreType: getFarheroXpScoreType(),
          modifier: t.score
        });
      });
    } finally {
      await n.endSession();
    }
  }
  async _canCompleteQuest({
    player: e,
    quest: a
  }, t) {
    return !e.quests[a.id] && (a.minReferralCount ? await this._getTotalReferral(t.accountId || t.account._id) || a.minReferralCount <= 0 : !!a.minSummonCount && e.monsters.length >= a.minSummonCount);
  }
  async claimBonusReward({
    questId: e
  }, a) {
    var t = this.referralQuests[e] || this.unboxQuests[e];
    if (!t) throw new Error("Quest not found");
    var r = a.account._id || a.accountId, r = await Player.findOne({
      account: r
    });
    if (!await this._canCompleteQuest({
      player: r,
      quest: t
    }, a)) throw new Error("Cannot complete quest");
    t = t.reward;
    "farpoints" === t.itemUniqueId ? await this.scoreService.setScore({
      address: a.account.addresses[0].address,
      scoreType: this.farpointsScoreType,
      modifier: t.quantity
    }) : (await this._giveRentedPacksToPlayer({
      player: r,
      packType: "genesis-booster-n-t" === t.itemUniqueId ? "normal" : "premium",
      quantity: t.quantity
    }), r.quests || (r.quests = {}), r.quests = {
      ...r.quests,
      [e]: !0
    }, await r.save());
  }
  async claimQuestReward({
    questId: e
  }, a) {
    if ("referral" === e) return this.claimReferralReward(a);
    if (this.referralQuests[e || this.unboxQuests[e]]) return this.claimBonusReward({
      questId: e
    }, a);
    if (this.quests[e]) return this.completeQuest(e, a);
    throw new Error("Quest not found");
  }
  _applyCardAbilities({
    match: e,
    action: a,
    attackerIndex: t,
    defenderIndex: r,
    attackerCard: s,
    defenderCard: o,
    trigger: n = null
  }) {
    var i = this._getCardAbilities(e.gameCards, s), d = this._getCardAbilities(e.gameCards, o);
    n ? (-1 !== s && this._applyAbilities(e, a, t, r, i, n), -1 !== o && this._applyAbilities(e, a, r, t, d, n)) : (this._applyAbilities(e, a, t, r, i, TRIGGER.VengefulStrike), 
    this._applyAbilities(e, a, r, t, d, TRIGGER.Retaliate), 0 < d.length && 0 < a.gameCardStats[o]?.health && this._applyAbilities(e, a, r, t, d, TRIGGER.ShieldBash), 
    0 < d.length && a.gameCardStats[o]?.health <= 0 && this._applyAbilities(e, a, r, t, d, TRIGGER.Deathplea), 
    a.gameCardStats[s]?.health <= 0 && 0 < i.length && this._applyAbilities(e, a, t, r, i, TRIGGER.MartyrsGift));
  }
  _getCardAbilities(e, a) {
    return -1 !== a && e[a].abilities || [];
  }
  _applyAbilities(t, r, s, o, e, n) {
    e.forEach(e => {
      var a;
      e.trigger === n && (a = r.gameCardStats[s]?.attack || 0, this._applyEffect(t, r, s, o, e.effect, a, n));
    });
  }
  _applyEffect(a, r, e, t, s, o, n) {
    let i;
    i = n === TRIGGER.Summon ? r.playersField[e]?.[r.target] : r.playersField[e]?.[r.source];
    var d = r.playersField[t]?.[r.target];
    switch (s) {
     case EFFECT.DealDamageToAttacker:
      void 0 !== d && -1 !== d && (r.gameCardStats[d].health -= o, r.gameCardStats[d].health = Math.max(r.gameCardStats[d].health, 0));
      break;

     case EFFECT.DealDamageToAllEnemies:
      r.playersField[t].forEach(e => {
        -1 !== e && (r.gameCardStats[e].health -= o, r.gameCardStats[e].health = Math.max(r.gameCardStats[e].health, 0));
      });
      break;

     case EFFECT.DealDamageToAllAllies:
      r.playersField[e].forEach(e => {
        -1 !== e && (r.gameCardStats[e].health -= o, r.gameCardStats[e].health = Math.max(r.gameCardStats[e].health, 0));
      });
      break;

     case EFFECT.DealDamageToSelf:
      void 0 !== i && -1 !== i && (r.gameCardStats[i].health -= o, r.gameCardStats[i].health = Math.max(r.gameCardStats[i].health, 0));
      break;

     case EFFECT.DealDamageToField:
      r.playersField.forEach(e => {
        e.forEach(e => {
          -1 !== e && (r.gameCardStats[e].health -= o, r.gameCardStats[e].health = Math.max(r.gameCardStats[e].health, 0));
        });
      });
      break;

     case EFFECT.DealDamageToOpponent:
      r.playersHealth[t] -= o, r.playersHealth[t] = Math.max(r.playersHealth[t], 0);
      break;

     case EFFECT.HealSelf:
      void 0 !== i && -1 !== i && (r.gameCardStats[i].health = a.gameCards[i].stats.health || r.gameCardStats[i].health);
      break;

     case EFFECT.HealField:
      r.playersField.forEach(e => {
        e.forEach(e => {
          -1 !== e && (r.gameCardStats[e].health = a.gameCards[e].stats.health || r.gameCardStats[e].health);
        });
      });
      break;

     case EFFECT.HealAllAllies:
      r.playersField[e].forEach(e => {
        -1 !== e && (r.gameCardStats[e].health = a.gameCards[e].stats.health || r.gameCardStats[e].health);
      });
      break;

     case EFFECT.HealAllEnemies:
      r.playersField[t].forEach(e => {
        -1 !== e && (r.gameCardStats[e].health = a.gameCards[e].stats.health || r.gameCardStats[e].health);
      });
      break;

     case EFFECT.DestroyHand:
      r.playersHand[e] = r.playersHand[e].map(() => -1);
      break;

     case EFFECT.DestroyOpponentHand:
      r.playersHand[t] = r.playersHand[t].map(() => -1);
      break;

     case EFFECT.DestroyOpponentField:
      r.playersField[t] = r.playersField[t].map(() => -1);
      break;

     case EFFECT.ReturnToHandClearHand:
      void 0 !== i && -1 !== i && (r.playersHand[e] = r.playersHand[e].map((e, a) => 0 === a ? i : -1), 
      r.playersField[e][r.source] = -1);
      break;

     case EFFECT.DestroyYourField:
      r.playersField[e] = r.playersField[e].map((e, a) => a === r.target && n === TRIGGER.Summon ? e : -1);
      break;

     case EFFECT.DestroyField:
      r.playersField = r.playersField.map(e => e.map(() => -1));
      break;

     case EFFECT.DestroySelf:
      void 0 !== i && -1 !== i && (r.playersField[e][r.source] = -1);
      break;

     default:
      console.error("Unrecognized effect: " + s);
    }
    r.playersField.forEach((e, t) => {
      e.forEach((e, a) => {
        -1 !== e && r.gameCardStats[e].health <= 0 && (r.playersField[t][a] = -1);
      });
    });
  }
  async getInventory({
    address: t,
    playerId: r,
    limit: s = 15,
    cursor: o = null,
    filters: n = {},
    sort: i = "createdAt"
  }) {
    try {
      if (!o) {
        var d = await memcache.get(this.INVENTORY_CACHE_KEY + ":" + t);
        if (d) return JSON.parse(d.value);
      }
      var l, c = {};
      if (t && (new Date(Date.now() + this.PACK_GRACE_PERIOD_SECONDS), 0 < (l = await CastHandle.find({
        owner: t.toLowerCase()
      })).length) && (c.$or = [ {
        handle: {
          $in: l.map(e => e._id)
        }
      } ]), r && (c.$or = c.$or || [], c.$or.push({
        rentedTo: r,
        expiresAt: {
          $gte: new Date()
        }
      })), !c.$or || 0 === c.$or.length) return {
        inventory: [],
        nextCursor: null,
        totalCount: 0
      };
      n.rarity && (c["card.rarity"] = n.rarity), n.type && (c["card.type"] = n.type);
      var h = await PlayableCard.countDocuments(c);
      let e = PlayableCard.find(c).populate("card handle").sort({
        [i]: -1
      }).limit(s), a = await (e = o ? e.skip(parseInt(o)) : e).exec();
      a = await Promise.all(a.map(async e => e.handle ? {
        ...e.toObject(),
        handle: e.handle
      } : e.toObject()));
      var p = o ? parseInt(o) + a.length : a.length, u = p < h, y = {
        inventory: a,
        nextCursor: u ? p.toString() : null,
        totalCount: h
      };
      return o || await memcache.set(this.INVENTORY_CACHE_KEY + ":" + t, JSON.stringify(y), {
        lifetime: this.CACHE_TTL
      }), y;
    } catch (e) {
      throw console.error(e), Sentry.captureException(e), new Error("Unable to fetch inventory");
    }
  }
  async getPacks({
    address: a,
    playerId: t,
    limit: r = 15,
    cursor: s = null,
    filters: o = {},
    sort: n = "createdAt"
  }) {
    try {
      if (!s) {
        var i = await memcache.get(this.PACKS_CACHE_KEY + ":" + a);
        if (i) return JSON.parse(i.value);
      }
      var d, l, c = {
        openedAt: null
      };
      if (a && (d = new Date(this.PACK_GRACE_PERIOD_SECONDS), 0 < (l = await CastHandle.find({
        owner: a.toLowerCase(),
        expiresAt: {
          $gt: d
        }
      })).length) && (c.$or = [ {
        handle: {
          $in: l.map(e => e._id)
        }
      } ]), t && (c.$or = c.$or || [], c.$or.push({
        rentedTo: t,
        expiresAt: {
          $gte: new Date()
        }
      })), !c.$or || 0 === c.$or.length) return {
        packs: [],
        nextCursor: null,
        totalCount: 0
      };
      o.type && (c.type = o.type);
      var h = await Pack.countDocuments(c);
      let e = Pack.find(c).sort({
        [n]: -1
      }).limit(r);
      var p = await (e = s ? e.skip(parseInt(s)) : e).exec(), u = s ? parseInt(s) + p.length : p.length, y = {
        packs: p,
        nextCursor: u < h ? u.toString() : null,
        totalCount: h
      };
      return s || await memcache.set(this.PACKS_CACHE_KEY + ":" + a, JSON.stringify(y), {
        lifetime: this.CACHE_TTL
      }), y;
    } catch (e) {
      throw console.error(e), Sentry.captureException(e), new Error("Unable to fetch packs");
    }
  }
  async applyInvite({
    inviteCode: a,
    referralType: t = "WEB"
  }, r) {
    var s = async e => {
      var a = await Account.findOne({
        username: this.INTERNAL_ACCOUNT_USERNAME
      });
      if (!a) throw new Error("Internal account not found");
      e.invitedBy = a._id, await e.save();
    };
    try {
      var o, n, e = r.account._id || r.account, i = await Player.findOne({
        account: e
      });
      if (!i) throw new Error("Player not found");
      if (i.invitedBy) return {
        success: !0,
        message: "You have already been invited before!"
      };
      if (this.INTERNAL_INVITE_CODES.includes(a?.toLowerCase?.())) await s(i); else {
        if (a === this.FARHERO_CHECK_PASSES_INVITE_CODE) return await r.account.populate("addresses"), 
        o = r.account.addresses[0].address?.toLowerCase(), n = (await getAddressPasses(o, !1))["passes"], 
        n.length >= this.FARHERO_HANDLES_REQUIRED_FOR_INVITE ? (await s(i), {
          success: !0,
          message: "You have enough .cast handles!"
        }) : {
          success: !1,
          message: `You do not have ${this.FARHERO_HANDLES_REQUIRED_FOR_INVITE} .cast handles!`
        };
        let e;
        var d = await memcache.get("FarcasterTcgService:invite:" + a);
        if (d ? e = JSON.parse(d.value) : (e = await AccountInvite.findOne({
          code: a
        })) && await memcache.set("FarcasterTcgService:invite:" + a, JSON.stringify(e)), 
        !e) throw new Error("Invalid invite code or already used. Try another invite code!");
        if (-1 !== e.maxUseCount && e.useCount >= e.maxUseCount) throw new Error("Invite code has reached the maximum use count");
        if (!await Account.findById(e.account)) throw new Error("Inviter not found");
        i.invitedBy = e.account, e.useCount = e.useCount + 1, await Promise.all([ i.save(), e.save() ]), 
        await Referral.updateOne({
          uniqueIdentifier: i._id
        }, {
          code: a,
          referralType: t,
          account: e.account,
          uniqueIdentifier: i._id,
          extraData: {
            username: r.account.username
          },
          referralOrigin: "FARHERO",
          isValid: !0
        }, {
          upsert: !0
        }), await memcache.delete(`Referral:FARHERO:${e.account}:total:count`, {
          noreply: !0
        });
      }
      return {
        success: !0,
        message: "Invite applied successfully"
      };
    } catch (e) {
      throw console.error("Error applying invite:", e), new Error("Failed to apply invite: " + e.message);
    }
  }
}

module.exports = {
  Service: FarcasterTcgService
};