const mongoose = require("mongoose"), TRIGGER = {
  Deathplea: "Deathplea",
  Summon: "Summon",
  Retaliate: "Retaliate",
  ShieldBash: "Shield Bash",
  VengefulStrike: "Vengeful Strike",
  MartyrsGift: "Martyr's Gift"
}, EFFECT = {
  DealDamageToAttacker: "Damage Attacker Twice",
  DealDamageToAllEnemies: "Damage All Enemies",
  DealDamageToAllAllies: "Damage All Allies",
  DealDamageToSelf: "Damage Self",
  DealDamageToField: "Damage Field",
  DealDamageToOpponent: "Damage Opponent",
  HealSelf: "Heal Self",
  HealField: "Heal Field",
  HealAllAllies: "Heal All Allies",
  HealAllEnemies: "Heal All Enemies",
  DestroyHand: "Destroy Your Hand",
  DestroyOpponentHand: "Destroy Opponent's Hand",
  DestroyOpponentField: "Destroy Opponent's Field",
  ReturnToHandClearHand: "Return to Hand, Clear Hand",
  DestroyYourField: "Destroy Your Field",
  DestroyField: "Destroy Field",
  DestroySelf: "Destroy Self"
}, CLASSES = [ "Shadow League", "Allurer", "Explorer", "Gunslinger", "Mythic", "Outlander", "Berserker", "Bard", "Hunter", "Soldier", "Warrior", "Ravager", "Enchanter", "Scholar", "Sentinel", "Rogue", "Tinkerer", "Beastcaller", "Merchant", "Twin" ], FAMILIES = [ "Faithless", "Saharan", "Urchin", "Vaqueros", "Kingdomborn", "Rivermarch", "Hybridkin", "Tarnished", "Celestial", "Cyborg", "Fjordborn", "Solari", "Highlander", "Lotusborn", "Tidescaller", "Inseperable", "Bilgewater" ], cardSchema = new mongoose.Schema({
  cardId: {
    type: String
  },
  name: {
    type: String,
    required: !0
  },
  rarity: {
    type: String,
    enum: [ "Common", "Rare", "Super-Rare", "Ultra-Rare", "Legendary", "Mythic" ],
    required: !0
  },
  type: {
    type: String,
    enum: [ "Hero" ],
    required: !0
  },
  set: {
    type: String,
    enum: [ "Genesis" ],
    required: !0
  },
  image: {
    type: String,
    required: !0
  },
  foilOverrides: [ {
    type: {
      type: String,
      enum: [ "Standard", "Prize" ]
    },
    mask: {
      type: String
    },
    altArt: {
      type: String
    }
  } ],
  class: {
    type: String,
    required: !0,
    enum: CLASSES
  },
  family: {
    type: String,
    required: !0,
    enum: FAMILIES
  },
  abilities: [ {
    trigger: {
      type: String,
      enum: Object.values(TRIGGER),
      required: !0
    },
    effect: {
      type: String,
      enum: Object.values(EFFECT),
      required: !0
    }
  } ],
  stats: {
    attack: {
      type: Number,
      required: !0
    },
    health: {
      type: Number,
      required: !0
    },
    cost: {
      type: Number,
      required: !0
    }
  }
}, {
  timestamps: !0
}), playableCardSchema = new mongoose.Schema({
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Card"
  },
  wear: {
    type: String,
    validate: {
      validator: function(e) {
        return /^\d+(\.\d{50,50})?$/.test(e) && 0 <= parseFloat(e) && parseFloat(e) <= 1;
      },
      message: e => e.value + " is not a valid wear value. It must be a string representation of a number between 0 and 1, with 50 decimal places."
    },
    required: !0
  },
  foil: {
    type: String,
    enum: [ "None", "Standard", "Prize" ],
    required: !0
  },
  handle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CastHandle"
  },
  rentedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Player"
  },
  expiresAt: {
    type: Date,
    index: !0,
    default: null
  }
}, {
  timestamps: !0
}), packSchema = (cardSchema.index({
  name: 1,
  set: 1
}), cardSchema.index({
  rarity: 1
}), cardSchema.index({
  rentedTo: 1,
  expiresAt: 1
}), cardSchema.index({
  type: 1
}), cardSchema.index({
  set: 1,
  rarity: 1
}), cardSchema.index({
  rarity: 1,
  type: 1
}), cardSchema.index({
  class: 1
}), cardSchema.index({
  family: 1
}), new mongoose.Schema({
  set: {
    type: String,
    enum: [ "Genesis" ],
    required: !0
  },
  type: {
    type: String,
    enum: [ "Normal", "Premium", "Collector" ],
    required: !0
  },
  handle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CastHandle",
    index: !0
  },
  rentedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Player"
  },
  expiresAt: {
    type: Date,
    index: !0,
    default: null
  },
  openedAt: {
    type: Date,
    index: !0,
    default: null
  },
  openedCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.PlayableCard"
  }
}, {
  timestamps: !0
})), playerSchema = (packSchema.index({
  handle: 1
}), packSchema.index({
  rentedTo: 1
}), packSchema.index({
  expiresAt: 1
}), packSchema.index({
  openedAt: 1
}), packSchema.index({
  openedAt: 1,
  expiresAt: 1,
  handle: 1
}), packSchema.index({
  openedAt: 1,
  handle: 1
}), packSchema.index({
  expiresAt: 1,
  openedAt: 1
}), packSchema.index({
  rentedTo: 1,
  openedAt: 1
}), packSchema.index({
  handle: 1,
  openedAt: 1
}), packSchema.index({
  rentedTo: 1,
  openedAt: 1,
  expiresAt: 1
}), packSchema.index({
  createdAt: -1
}), packSchema.index({
  type: 1,
  createdAt: -1
}), packSchema.index({
  rentedTo: 1,
  expiresAt: 1,
  openedAt: 1
}), packSchema.index({
  openedAt: 1,
  type: 1
}), packSchema.index({
  openedAt: 1,
  type: 1,
  createdAt: -1
}), packSchema.index({
  handle: 1,
  openedAt: 1,
  type: 1
}), packSchema.index({
  rentedTo: 1,
  expiresAt: 1,
  openedAt: 1,
  type: 1
}), packSchema.index({
  handle: 1,
  openedAt: 1,
  type: 1,
  expiresAt: 1
}), packSchema.index({
  rentedTo: 1,
  openedAt: 1,
  type: 1,
  expiresAt: 1
}), packSchema.index({
  "card.rarity": 1,
  handle: 1
}), packSchema.index({
  "card.type": 1,
  handle: 1
}), new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  },
  cards: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.PlayableCard",
    default: []
  } ],
  favorites: {
    type: [ {
      type: mongoose.Schema.Types.ObjectId,
      ref: "farcaster.tcg.PlayableCard"
    } ],
    default: []
  },
  campaignProgress: {
    currentLevel: {
      type: Number,
      default: 1
    },
    completedBattles: {
      type: [ String ],
      default: []
    }
  },
  resources: {
    type: Number,
    default: 0
  },
  isBot: {
    type: Boolean,
    default: !1
  },
  customOverrides: {
    name: {
      type: String
    },
    profilePicture: {
      type: String
    },
    description: {
      type: String
    }
  },
  appliedReferralCount: {
    type: Number,
    default: 0
  },
  quests: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  dropClaimed: {
    type: Boolean,
    default: !1
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  }
}, {
  timestamps: !0
})), matchSchema = (playerSchema.index({
  account: 1
}), playerSchema.index({
  cards: 1
}), playerSchema.index({
  favorites: 1
}), playerSchema.index({
  isBot: 1
}), playerSchema.index({
  account: 1,
  cards: 1
}), playerSchema.index({
  account: 1,
  favorites: 1
}), playerSchema.index({
  account: 1,
  invitedBy: 1
}), playerSchema.index({
  "quests.id": 1,
  account: 1
}), new mongoose.Schema({
  tick: {
    type: Number,
    default: 0
  },
  players: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Player"
  } ],
  playerFavorites: [ [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.PlayableCard"
  } ] ],
  isBotMatch: {
    type: Boolean,
    default: !1
  },
  botDifficulty: {
    type: Number
  },
  botOpponent: {
    type: String,
    enum: [ "opp1", "opp2", "opp3", "opp4", "opp5" ],
    default: "opp1"
  },
  arena: {
    type: String,
    enum: [ "arena1", "arena2", "arena3", "arena4", "arena5" ],
    default: "arena1"
  },
  winners: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Player"
  } ],
  playersRewards: [ [ {
    type: mongoose.Schema.Types.Mixed
  } ] ],
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  playersQuitted: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Player"
  } ],
  playersHealthStart: [ {
    type: Number,
    required: !0
  } ],
  gameCards: [ {
    type: Object
  } ],
  rounds: [ {
    actions: [ {
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "farcaster.tcg.Player",
        required: !0
      },
      targetPlayer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "farcaster.tcg.Player"
      },
      source: {
        type: Number,
        default: -1
      },
      target: {
        type: Number,
        default: -1
      },
      type: {
        type: String,
        enum: [ "InitializeRound", "PurchaseCard", "PlayCard", "CardAttack", "DrawCards", "RefreshShop", "AutoBattle" ],
        required: !0
      },
      time: {
        type: Date,
        required: !0
      },
      cost: {
        type: Number,
        required: !0
      },
      playersHealth: [ {
        type: Number,
        required: !0
      } ],
      playersEnergy: [ {
        type: Number,
        required: !0
      } ],
      playersHand: [ [ {
        type: Number,
        required: !0
      } ] ],
      playersField: [ [ {
        type: Number,
        required: !0
      } ] ],
      playersShop: [ [ {
        type: Number,
        required: !0
      } ] ],
      gameCardStats: [ {
        type: Object,
        required: !0
      } ]
    } ],
    start: {
      type: Date,
      required: !0
    },
    shopDeadline: {
      type: Date
    },
    end: {
      type: Date
    },
    number: {
      type: Number,
      required: !0
    },
    battleAcknowledgement: [ {
      type: Boolean,
      required: !0
    } ],
    state: {
      type: String,
      enum: [ "Shop", "Battle", "Ended" ],
      default: "Shop"
    }
  } ]
})), tournamentSchema = (matchSchema.index({
  players: 1
}), matchSchema.index({
  startTime: -1
}), matchSchema.index({
  endTime: 1
}), matchSchema.index({
  "playerFavorites.0": 1
}), matchSchema.index({
  "players.account": 1
}), matchSchema.index({
  winners: 1
}), matchSchema.index({
  "winners.account": 1
}), matchSchema.index({
  players: 1,
  endTime: 1
}), matchSchema.index({
  players: 1,
  startTime: 1,
  endTime: 1
}), matchSchema.index({
  "rounds.state": 1,
  startTime: 1
}), new mongoose.Schema({
  name: {
    type: String,
    required: !0
  },
  startDate: {
    type: Date,
    required: !0
  },
  endDate: {
    type: Date,
    required: !0
  },
  participants: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Player"
  } ],
  matches: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Match"
  } ],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "farcaster.tcg.Player"
  }
}));

tournamentSchema.index({
  startDate: 1
}), tournamentSchema.index({
  name: 1
}), playableCardSchema.index({
  createdAt: -1
}), playableCardSchema.index({
  "card.rarity": 1,
  createdAt: -1
}), playableCardSchema.index({
  "card.type": 1,
  createdAt: -1
}), playableCardSchema.index({
  handle: 1,
  createdAt: -1
}), playableCardSchema.index({
  rentedTo: 1,
  expiresAt: 1,
  createdAt: -1
}), playableCardSchema.index({
  handle: 1,
  card: 1
}), playableCardSchema.index({
  rentedTo: 1,
  expiresAt: 1,
  card: 1
}), playableCardSchema.index({
  "card.rarity": 1,
  handle: 1
}), playableCardSchema.index({
  "card.type": 1,
  handle: 1
}), module.exports = {
  cardSchema: cardSchema,
  playerSchema: playerSchema,
  matchSchema: matchSchema,
  tournamentSchema: tournamentSchema,
  playableCardSchema: playableCardSchema,
  packSchema: packSchema,
  TRIGGER: TRIGGER,
  EFFECT: EFFECT,
  CLASSES: CLASSES,
  FAMILIES: FAMILIES
};