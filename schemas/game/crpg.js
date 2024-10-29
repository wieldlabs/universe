const mongoose = require("../../connectdb")["mongoose"], NodeType = {
  START: "start",
  DIALOG: "dialog",
  ROLL_CHECK: "roll_check"
}, BackgroundType = {
  IMAGE: "image",
  VIDEO: "video"
}, InteractiveElementType = {
  CLICKABLE_AREA: "clickable_area"
}, storySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.User",
    required: !0
  },
  title: {
    type: String,
    required: !0
  },
  description: {
    type: String
  }
}, {
  timestamps: !0
}), levelSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.Story",
    required: !0
  },
  name: {
    type: String
  },
  backgroundType: {
    type: String,
    enum: Object.values(BackgroundType)
  },
  backgroundUrl: {
    type: String
  }
}, {
  timestamps: !0
}), nodeSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.Story",
    required: !0
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Level"
  },
  nodeType: {
    type: String,
    enum: Object.values(NodeType),
    required: !0
  },
  content: {
    type: String
  }
}, {
  timestamps: !0
}), edgeSchema = new mongoose.Schema({
  fromNodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.Node",
    required: !0
  },
  toNodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.Node",
    required: !0
  },
  condition: {
    type: String
  }
}, {
  timestamps: !0
}), characterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.User",
    required: !0
  },
  name: {
    type: String,
    required: !0
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed
  },
  experience: {
    type: Number,
    default: 0
  }
}, {
  timestamps: !0
}), storyCharacterSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.Story",
    required: !0
  },
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.Character",
    required: !0
  }
}), interactiveElementSchema = new mongoose.Schema({
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game.crpg.Level",
    required: !0
  },
  type: {
    type: String,
    enum: Object.values(InteractiveElementType),
    required: !0
  },
  position: {
    type: mongoose.Schema.Types.Mixed
  },
  action: {
    type: String
  }
}, {
  timestamps: !0
});

storySchema.index({
  userId: 1,
  title: 1
}), levelSchema.index({
  storyId: 1
}), nodeSchema.index({
  storyId: 1,
  levelId: 1
}), edgeSchema.index({
  fromNodeId: 1,
  toNodeId: 1
}), characterSchema.index({
  userId: 1
}), storyCharacterSchema.index({
  storyId: 1,
  characterId: 1
}), interactiveElementSchema.index({
  levelId: 1
}), module.exports = {
  storySchema: storySchema,
  levelSchema: levelSchema,
  nodeSchema: nodeSchema,
  edgeSchema: edgeSchema,
  characterSchema: characterSchema,
  storyCharacterSchema: storyCharacterSchema,
  interactiveElementSchema: interactiveElementSchema
};