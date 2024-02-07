const HTMLParser = require("node-html-parser"), cleanContentHtml = require("../helpers/html-sanitize-and-store")["cleanContentHtml"], Link = require("../models/Link")["Link"], Sentry = require("@sentry/node");

class ContentService {
  _findFirstLinkOrNull(t) {
    try {
      var n = HTMLParser.parse(t).querySelector("a");
      return n ? n.getAttribute("href") || null : null;
    } catch (t) {
      return Sentry.captureException(t), console.error(t), null;
    }
  }
  _jsonStringOrNull(t) {
    try {
      return JSON.stringify(t);
    } catch (t) {
      return Sentry.captureException(t), console.error(t), null;
    }
  }
  _makeContentWithMention({
    contentRaw: t,
    contentJson: n,
    contentHtml: e
  }) {
    var o = HTMLParser.parse(e), r = o.querySelectorAll('[data-type="mention"]');
    return r && r.length ? (r.map(t => {
      var n = t.getAttribute("data-id"), e = t.textContent;
      t.exchangeChild(t.firstChild, `<a href="https://beb.xyz?address=${n}">${e}</a>`);
    }), {
      contentRaw: t,
      contentJson: n,
      contentHtml: o.toString()
    }) : {
      contentRaw: t,
      contentJson: n,
      contentHtml: e
    };
  }
  async _makeRichContentWithLinkPreview({
    contentRaw: t,
    contentJson: n,
    contentHtml: e,
    blocks: o = []
  }) {
    const r = this._findFirstLinkOrNull(e);
    return r && await new Promise(n => {
      Link.createRichLink({
        url: r,
        callback: t => {
          t && o.push({
            blockType: "LINK",
            blockId: t._id
          }), n();
        },
        onError: t => {
          console.error(t), n();
        }
      });
    }), {
      contentRaw: t,
      contentJson: n,
      contentHtml: e,
      blocks: o
    };
  }
  _makeRichContentWithBlocks({
    contentRaw: t,
    contentJson: n,
    contentHtml: e,
    blocks: o = []
  }) {
    o = o.filter(t => t.blockType && t.blockId).map(t => ({
      blockType: t.blockType,
      blockId: t.blockId
    }));
    return {
      content: this.makeContent({
        contentRaw: t,
        contentJson: n,
        contentHtml: e
      }),
      blocks: o
    };
  }
  makeContent({
    contentRaw: t = "",
    contentJson: n = "",
    contentHtml: e = ""
  }) {
    n = this._makeContentWithMention({
      contentRaw: t,
      contentJson: n,
      contentHtml: e
    });
    return {
      json: this._jsonStringOrNull(n.contentJson),
      raw: t ? "" + n.contentRaw : null,
      html: e ? "" + cleanContentHtml(n.contentHtml) : null
    };
  }
  async makeRichContent({
    contentRaw: t = "",
    contentJson: n = "",
    contentHtml: e = "",
    blocks: o = []
  }) {
    t = await this._makeRichContentWithLinkPreview({
      contentRaw: t,
      contentJson: n,
      contentHtml: e,
      blocks: o
    });
    return this._makeRichContentWithBlocks(t);
  }
}

module.exports = {
  Service: ContentService
};