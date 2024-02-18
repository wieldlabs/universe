const mongoose = require("mongoose"), schema = require("../../schemas/quests/quetRandomReward")["schema"];

class QuestRandomRewardClass {
  static ping() {
    console.log("model: QuestRandomRewardClass");
  }
}

schema.loadClass(QuestRandomRewardClass);

const QuestRandomReward = mongoose.models.QuestRandomReward || mongoose.model("QuestRandomReward", schema);

module.exports = {
  QuestRandomReward: QuestRandomReward
};