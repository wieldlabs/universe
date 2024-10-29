const mongoose = require("mongoose"), crypto = require("crypto"), Sentry = require("@sentry/node"), {
  cardSchema,
  playerSchema,
  matchSchema,
  playableCardSchema,
  packSchema,
  TRIGGER,
  EFFECT
} = require("../../../schemas/farcaster/tcg"), MAX_FAVORITES = 10, FREE_ODDS = [ {
  rarity: "Common",
  weight: 77e4
}, {
  rarity: "Rare",
  weight: 47e3
}, {
  rarity: "Super-Rare",
  weight: 2500
}, {
  rarity: "Ultra-Rare",
  weight: 490
}, {
  rarity: "Legendary",
  weight: 10
} ], PREMIUM_ODDS = [ {
  rarity: "Common",
  weight: 612e3
}, {
  rarity: "Rare",
  weight: 306e3
}, {
  rarity: "Super-Rare",
  weight: 61200
}, {
  rarity: "Ultra-Rare",
  weight: 19800
}, {
  rarity: "Legendary",
  weight: 500
} ], COLLECTOR_ODDS = [ {
  rarity: "Rare",
  weight: 12e4
}, {
  rarity: "Super-Rare",
  weight: 48e4
}, {
  rarity: "Ultra-Rare",
  weight: 315e3
}, {
  rarity: "Legendary",
  weight: 15e3
}, {
  rarity: "Mythic",
  weight: 1e3
} ], WEAR_ODDS = [ {
  wear: .05,
  weight: 2e4
}, {
  wear: .2,
  weight: 8e4
}, {
  wear: .45,
  weight: 4e5
}, {
  wear: .75,
  weight: 4e5
}, {
  wear: 1,
  weight: 1e5
} ], WEAR_DIGITS = 50, FOIL_ODDS = {
  Common: {
    None: 1e5
  },
  Rare: {
    None: 1e5
  },
  "Super-Rare": {
    None: 7e4,
    Standard: 3e4
  },
  "Ultra-Rare": {
    None: 6e4,
    Standard: 4e4
  },
  Legendary: {
    Standard: 7e4,
    Prize: 3e4
  },
  Mythic: {
    Standard: 9e4,
    Prize: 1e4
  }
};

function generateWeightedWear(a) {
  var e = a.reduce((e, {
    weight: a
  }) => e + a, 0), r = crypto.randomInt(e);
  let t = 0, o, l;
  for (let e = 0; e < a.length; e++) if (r < (t += a[e].weight)) {
    o = 0 < e ? a[e - 1] : {
      wear: 0,
      weight: 0
    }, l = a[e];
    break;
  }
  var e = o.wear, s = l.wear;
  return e + (r - (t - l.weight)) / l.weight * (s - e);
}

class PlayerClass {
  static ping() {
    console.log("model: PlayerClass");
  }
}

playerSchema.loadClass(PlayerClass);

const Player = mongoose.models.Player || mongoose.model("farcaster.tcg.Player", playerSchema);

class MatchClass {
  static ping() {
    console.log("model: MatchClass");
  }
}

matchSchema.loadClass(MatchClass);

const Match = mongoose.models.Match || mongoose.model("farcaster.tcg.Match", matchSchema);

class PlayableCardClass {
  static ping() {
    console.log("model: PlayableCardClass");
  }
  async getCard() {
    return Card.findById(this.card);
  }
}

playableCardSchema.loadClass(PlayableCardClass);

const PlayableCard = mongoose.models.PlayableCard || mongoose.model("farcaster.tcg.PlayableCard", playableCardSchema);

class PackClass {
  static ping() {
    console.log("model: PackClass");
  }
}

packSchema.loadClass(PackClass);

const Pack = mongoose.models.Pack || mongoose.model("farcaster.tcg.Pack", packSchema);

class CardClass {
  static ping() {
    console.log("model: CardClass");
  }
  static async randomUnbox({
    type: e = "free",
    set: a
  }) {
    var r, t, e = "premium" === e ? PREMIUM_ODDS : "collector" === e ? COLLECTOR_ODDS : FREE_ODDS, o = e.reduce((e, {
      weight: a
    }) => e + a, 0), l = crypto.randomInt(0, o);
    let s, c = 0;
    for ({
      rarity: r,
      weight: t
    } of e) if (l < (c += t)) {
      s = r;
      break;
    }
    o = await this.find({
      rarity: s,
      set: a
    });
    if (0 === o.length) throw new Error(`No cards found with ${s} rarity in set ` + a);
    e = o[crypto.randomInt(0, o.length)], o = generateWeightedWear(WEAR_ODDS);
    if (void 0 === o) throw new Error(`Failed to select a wear condition - ${s} ${a} ${wearRandomValue} ` + c);
    let i;
    c = 0;
    a = FOIL_ODDS[s];
    if (!a) throw new Error("No foil odds found for rarity " + s);
    var n, d, g = Object.values(a).reduce((e, a) => e + a, 0), h = crypto.randomInt(0, g);
    for ([ n, d ] of Object.entries(a)) if (h < (c += d)) {
      i = n;
      break;
    }
    if (i) return {
      ...e.toObject(),
      wear: o.toFixed(WEAR_DIGITS),
      foil: i
    };
    throw new Error(`Failed to select a foil type for rarity ${s} ${h} ` + c);
  }
  static getUnboxingOdds() {
    var e = e => {
      const t = e.reduce((e, {
        weight: a
      }) => e + a, 0);
      return e.map(({
        rarity: e,
        wear: a,
        weight: r
      }) => ({
        rarity: e || a,
        percentage: r / t * 100
      }));
    };
    const r = WEAR_ODDS.reduce((e, {
      weight: a
    }) => e + a, 0);
    return {
      normal: e(FREE_ODDS),
      premium: e(PREMIUM_ODDS),
      collector: e(COLLECTOR_ODDS),
      wear: WEAR_ODDS.map(({
        wear: e,
        weight: a
      }) => ({
        wear: e.toFixed(2),
        percentage: a / r * 100
      })),
      foil: (e => {
        var a, r, t = {};
        for ([ a, r ] of Object.entries(e)) {
          const o = Object.values(r).reduce((e, a) => e + a, 0);
          t[a] = Object.entries(r).map(([ e, a ]) => ({
            foilType: e,
            percentage: a / o * 100
          }));
        }
        return t;
      })(FOIL_ODDS)
    };
  }
}

cardSchema.loadClass(CardClass);

const Card = mongoose.models.Card || mongoose.model("farcaster.tcg.Card", cardSchema);

module.exports = {
  Player: Player,
  Match: Match,
  Card: Card,
  PlayableCard: PlayableCard,
  Pack: Pack,
  MAX_FAVORITES: MAX_FAVORITES,
  TRIGGER: TRIGGER,
  EFFECT: EFFECT
};