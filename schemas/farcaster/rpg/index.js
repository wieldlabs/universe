const mongoose = require("mongoose"), hubSubscriptionsSchema = new mongoose.Schema({
  host: {
    type: String,
    required: !0,
    unique: !0
  },
  lastEventId: Number,
  lastBackfillFid: Number
}), monsterSchema = (hubSubscriptionsSchema.index({
  lastEventId: 1
}), hubSubscriptionsSchema.index({
  lastBackfillFid: 1
}), hubSubscriptionsSchema.index({
  host: 1
}), new mongoose.Schema({
  name: {
    type: String,
    required: !0
  },
  image: {
    type: String
  },
  element: {
    type: String,
    enum: [ "Flame", "Ice", "Nature", "Light", "Shadow" ],
    required: !0
  },
  stars: {
    type: Number,
    min: 1,
    max: 6,
    required: !0
  },
  level: {
    type: Number,
    min: 1,
    max: 40,
    default: 1
  },
  baseStats: {
    hp: {
      type: Number,
      required: !0
    },
    attack: {
      type: Number,
      required: !0
    },
    defense: {
      type: Number,
      required: !0
    },
    speed: {
      type: Number,
      required: !0
    }
  },
  skills: [ {
    name: {
      type: String,
      required: !0
    },
    description: {
      type: String,
      required: !0
    },
    cooldown: {
      type: Number,
      min: 0
    }
  } ],
  awakened: {
    type: Boolean,
    default: !1
  },
  awakenedName: {
    type: String
  },
  awakenBonus: {
    type: String
  }
})), playerSchema = (monsterSchema.index({
  name: 1,
  element: 1
}), monsterSchema.index({
  stars: 1
}), monsterSchema.index({
  stars: 1,
  element: 1
}), new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  },
  level: {
    type: Number,
    min: 1,
    default: 1
  },
  monsters: [ {
    monster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "farcaster.rpg.Monster"
    },
    currentLevel: {
      type: Number,
      min: 1,
      max: 40
    },
    currentStars: {
      type: Number,
      min: 1,
      max: 6
    },
    currentStats: {
      hp: Number,
      attack: Number,
      defense: Number,
      speed: Number
    },
    runes: [ {
      type: mongoose.Schema.Types.ObjectId,
      ref: "farcaster.rpg.Rune"
    } ]
  } ],
  appliedReferralCount: {
    type: Number,
    default: 0
  },
  quests: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  consumableItems: [ {
    itemUniqueId: {
      type: String,
      required: !0
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "farcaster.rpg.ConsumableItem"
    },
    quantity: {
      type: Number,
      min: 0,
      default: 0
    }
  } ]
})), runeSchema = (playerSchema.index({
  account: 1
}), playerSchema.index({
  level: -1
}), playerSchema.index({
  "monsters.monster": 1
}), playerSchema.index({
  "monsters.currentStars": 1
}), playerSchema.index({
  "monsters.currentLevel": 1
}), new mongoose.Schema({
  set: {
    type: String,
    enum: [ "Energy", "Fatal", "Blade", "Swift", "Despair", "Focus" ],
    required: !0
  },
  slot: {
    type: Number,
    min: 1,
    max: 6,
    required: !0
  },
  stars: {
    type: Number,
    min: 1,
    max: 6,
    required: !0
  },
  level: {
    type: Number,
    min: 0,
    max: 15,
    default: 0
  },
  mainStat: {
    type: {
      type: String,
      required: !0
    },
    value: {
      type: Number,
      required: !0
    }
  },
  subStats: [ {
    type: {
      type: String
    },
    value: {
      type: Number
    }
  } ]
})), consumableItemSchema = (runeSchema.index({
  set: 1,
  stars: -1
}), runeSchema.index({
  slot: 1
}), new mongoose.Schema({
  uniqueId: {
    type: String,
    required: !0,
    unique: !0
  },
  name: {
    type: String,
    required: !0
  },
  type: {
    type: String,
    enum: [ "Scroll" ]
  },
  rarity: {
    type: String,
    enum: [ "Common", "Uncommon", "Rare", "Epic", "Legendary" ],
    required: !0,
    default: "Common"
  },
  image: {
    type: String
  },
  description: {
    type: String
  }
}));

consumableItemSchema.index({
  uniqueId: 1
}), consumableItemSchema.index({
  type: 1,
  rarity: 1
}), module.exports = {
  playerSchema: playerSchema,
  runeSchema: runeSchema,
  monsterSchema: monsterSchema,
  consumableItemSchema: consumableItemSchema
};