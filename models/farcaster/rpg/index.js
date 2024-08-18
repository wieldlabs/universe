const mongoose = require("mongoose"), crypto = require("crypto"), {
  playerSchema,
  runeSchema,
  monsterSchema,
  consumableItemSchema
} = require("../../../schemas/farcaster/rpg");

class PlayerClass {
  static ping() {
    console.log("model: PlayerClass");
  }
}

playerSchema.loadClass(PlayerClass);

const Player = mongoose.models.Player || mongoose.model("farcaster.rpg.Player", playerSchema);

class RuneClass {
  static ping() {
    console.log("model: RuneClass");
  }
}

runeSchema.loadClass(RuneClass);

const Rune = mongoose.models.Rune || mongoose.model("farcaster.rpg.Rune", runeSchema);

class ConsumableItemClass {
  static ping() {
    console.log("model: ConsumableItemClass");
  }
}

consumableItemSchema.loadClass(ConsumableItemClass);

const ConsumableItem = mongoose.models.ConsumableItem || mongoose.model("farcaster.rpg.ConsumableItem", consumableItemSchema);

class MonsterClass {
  static ping() {
    console.log("model: MonsterClass");
  }
  static async randomSummon({
    type: e = "normal"
  }) {
    var s, o, e = "premium" === e ? [ {
      stars: 3,
      weight: 9150
    }, {
      stars: 4,
      weight: 800
    }, {
      stars: 5,
      weight: 50
    } ] : [ {
      stars: 1,
      weight: 8e3
    }, {
      stars: 2,
      weight: 1500
    }, {
      stars: 3,
      weight: 500
    } ], a = e.reduce((e, {
      weight: s
    }) => e + s, 0), r = crypto.randomInt(0, a);
    let t, l = 0;
    for ({
      stars: s,
      weight: o
    } of e) if (r < (l += o)) {
      t = s;
      break;
    }
    a = await this.find({
      stars: t
    });
    if (0 === a.length) throw new Error(`No monsters found with ${t} stars`);
    return a[crypto.randomInt(0, a.length)];
  }
}

monsterSchema.loadClass(MonsterClass);

const Monster = mongoose.models.Monster || mongoose.model("farcaster.rpg.Monster", monsterSchema);

module.exports = {
  Player: Player,
  Rune: Rune,
  Monster: Monster,
  ConsumableItem: ConsumableItem
};