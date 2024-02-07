const Image = require("../models/Image")["Image"], Link = require("../models/Link")["Link"], Quest = require("../models/quests/Quest")["Quest"], RichEmbed = require("../models/RichEmbed")["RichEmbed"], ContentService = require("./ContentService")["Service"], _QuestService = require("./QuestService")["Service"];

class RichBlockService {
  async _createKeyValueFieldsSchema({
    fields: e = []
  }) {
    return e.filter(e => e.key).map(e => ({
      key: e.key,
      value: e.value
    }));
  }
  async _createContentSchema({
    raw: e,
    json: t,
    html: i
  }) {
    return await new ContentService().makeContent({
      contentRaw: e,
      contentJson: t,
      contentHtml: i
    });
  }
  async _createImageBlock({
    src: e,
    name: t,
    isVerified: i,
    verificationOrigin: r,
    verificationTokenId: a,
    verificationContractAddress: c,
    verificationChainId: n,
    verificationExternalUrl: s
  }) {
    return await Image.create({
      src: e,
      name: t,
      isVerified: i,
      verificationOrigin: r,
      verificationTokenId: a,
      verificationContractAddress: c,
      verificationChainId: n,
      verificationExternalUrl: s
    });
  }
  async _createLinkBlock({
    url: e,
    image: t,
    title: i,
    description: r,
    logo: a,
    iframe: c
  }) {
    return await Link.create({
      url: e,
      image: t,
      title: i,
      description: r,
      logo: a,
      iframe: c
    });
  }
  async _createQuestBlock(e) {
    return await new _QuestService().createWithRequirementsAndRewards(e);
  }
  async _createRichEmbedBlock({
    url: e,
    title: t,
    timestamp: i,
    color: r,
    thumbnail: a = {},
    image: c = {},
    description: n = {},
    fields: s = []
  }) {
    var [ c, a, n, s ] = (await Promise.allSettled([ this.createBlock({
      blockType: "IMAGE",
      ...c
    }), this.createBlock({
      blockType: "IMAGE",
      ...a
    }), this.createBlockSchema({
      schemaType: "CONTENT",
      ...n
    }), this.createBlockSchema({
      schemaType: "KEY_VALUE_FIELDS",
      fields: s
    }) ])).map(e => "rejected" === e.status ? null : e.value);
    return await RichEmbed.create({
      url: e,
      title: t,
      timestamp: i,
      color: r,
      thumbnail: a?._id,
      image: c?._id,
      description: n,
      fields: s
    });
  }
  async createBlockSchema({
    schemaType: e,
    ...t
  }) {
    switch (e) {
     case "CONTENT":
      return this._createContentSchema(t);

     case "KEY_VALUE_FIELDS":
      return this._createKeyValueFieldsSchema(t);

     default:
      throw new Error("Unsupported block schema type: " + e);
    }
  }
  async getBlock({
    blockType: e,
    blockId: t
  }) {
    let i = null;
    return "IMAGE" === e ? i = await Image.findById(t) : "LINK" === e ? i = await Link.findById(t) : "RICH_EMBED" === e ? i = await RichEmbed.findById(t) : "QUEST" === e && (i = await Quest.findById(t)), 
    i;
  }
  async createBlock({
    blockType: e,
    ...t
  }) {
    switch (e) {
     case "IMAGE":
      return this._createImageBlock(t);

     case "LINK":
      return this._createLinkBlock(t);

     case "RICH_EMBED":
      return this._createRichEmbedBlock(t);

     case "QUEST":
      return this._createQuestBlock(t);

     default:
      throw new Error("Unsupported block type: " + e);
    }
  }
}

module.exports = {
  Service: RichBlockService
};