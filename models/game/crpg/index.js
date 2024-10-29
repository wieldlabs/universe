const mongoose = require("mongoose"), {
  storySchema,
  levelSchema,
  nodeSchema,
  edgeSchema,
  characterSchema,
  storyCharacterSchema,
  interactiveElementSchema
} = require("../../../schemas/game/crpg");

class StoryClass {
  static ping() {
    console.log("model: StoryClass");
  }
}

storySchema.loadClass(StoryClass);

const Story = mongoose.models.Story || mongoose.model("game.crpg.Story", storySchema);

class LevelClass {
  static ping() {
    console.log("model: LevelClass");
  }
}

levelSchema.loadClass(LevelClass);

const Level = mongoose.models.Level || mongoose.model("game.crpg.Level", levelSchema);

class NodeClass {
  static ping() {
    console.log("model: NodeClass");
  }
}

nodeSchema.loadClass(NodeClass);

const Node = mongoose.models.Node || mongoose.model("game.crpg.Node", nodeSchema);

class EdgeClass {
  static ping() {
    console.log("model: EdgeClass");
  }
}

edgeSchema.loadClass(EdgeClass);

const Edge = mongoose.models.Edge || mongoose.model("game.crpg.Edge", edgeSchema);

class CharacterClass {
  static ping() {
    console.log("model: CharacterClass");
  }
}

characterSchema.loadClass(CharacterClass);

const Character = mongoose.models.Character || mongoose.model("game.crpg.Character", characterSchema);

class StoryCharacterClass {
  static ping() {
    console.log("model: StoryCharacterClass");
  }
}

storyCharacterSchema.loadClass(StoryCharacterClass);

const StoryCharacter = mongoose.models.StoryCharacter || mongoose.model("game.crpg.StoryCharacter", storyCharacterSchema);

class InteractiveElementClass {
  static ping() {
    console.log("model: InteractiveElementClass");
  }
}

interactiveElementSchema.loadClass(InteractiveElementClass);

const InteractiveElement = mongoose.models.InteractiveElement || mongoose.model("game.crpg.InteractiveElement", interactiveElementSchema);

module.exports = {
  Story: Story,
  Level: Level,
  Node: Node,
  Edge: Edge,
  Character: Character,
  StoryCharacter: StoryCharacter,
  InteractiveElement: InteractiveElement
};