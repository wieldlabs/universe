const _RichBlockService = require("../../services/RichBlockService")["Service"], resolvers = {
  RichBlock: {
    __resolveType(e) {
      switch (e.type) {
       case "IMAGE":
        return "ImageUnion";

       case "LINK":
        return "LinkUnion";

       case "RICH_EMBED":
        return "RichEmbedUnion";

       case "QUEST":
        return "QuestUnion";

       case "SCRIPTABLE_ACTION":
        return "ScriptableActionUnion";

       default:
        return "ImageUnion";
      }
    }
  },
  RichContentBlock: {
    id: e => e.blockId,
    block: async e => {
      var c = await new _RichBlockService().getBlock({
        blockType: e.blockType,
        blockId: e.blockId
      });
      let o = null;
      return "IMAGE" === e.blockType ? o = "image" : "LINK" === e.blockType ? o = "link" : "RICH_EMBED" === e.blockType ? o = "richEmbed" : "QUEST" === e.blockType ? o = "quest" : "SCRIPTABLE_ACTION" === e.blockType && (o = "scriptableAction"), 
      c ? {
        _id: e.blockId,
        [o]: c,
        type: e.blockType
      } : null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};