const Service = require("../ContentService")["Service"], createDb = require("../../helpers/create-test-db")["createDb"], cleanContentHtml = require("../../helpers/html-sanitize-and-store")["cleanContentHtml"];

describe("Content Service tests", () => {
  let t, o;
  beforeEach(() => {
    jest.clearAllMocks();
  }), beforeAll(async () => {
    await (t = await createDb()).connect(), o = new Service();
  }), afterAll(async () => {
    await t.clearDatabase(), await t.closeDatabase();
  }), describe("_findFirstLinkOrNull", () => {
    it("should find the first link in a html string", async () => {
      var t = o._findFirstLinkOrNull('<p><a href="http://pump.com">pump.com</a></p>');
      expect(t).toEqual("http://pump.com");
    }), it("should find the first link if multiple links", async () => {
      var t = o._findFirstLinkOrNull('<p><a href="http://pump.com">pump.com</a><a href="https://beb.xyz">beb.xyz</a></p>');
      expect(t).toEqual("http://pump.com");
    }), it("should return null if no link is found", async () => {
      var t = o._findFirstLinkOrNull("<p></p>");
      expect(t).toEqual(null);
    }), it("should return null if the link has no href attribute", async () => {
      var t = o._findFirstLinkOrNull("<p><a></a></p>");
      expect(t).toEqual(null);
    });
  }), describe("_makeContentWithMention", () => {
    it("should replace the html with mentions nodes", () => {
      var t = o._makeContentWithMention({
        contentRaw: "@boredKitten",
        contentJson: null,
        contentHtml: '<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span></p>'
      })["contentHtml"];
      expect(t).toEqual('<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten"><a href="https://beb.xyz?address=0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531">@boredKitten</a></span></p>');
    }), it("should work with multiple mentions nodes", () => {
      var t = o._makeContentWithMention({
        contentRaw: "@boredKitten",
        contentJson: null,
        contentHtml: '<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span></p>'
      })["contentHtml"];
      expect(t).toEqual('<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten"><a href="https://beb.xyz?address=0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531">@boredKitten</a></span><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten"><a href="https://beb.xyz?address=0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531">@boredKitten</a></span></p>');
    });
  }), describe("makeContent", () => {
    it("should replace the content with appropriate cleanups", () => {
      var t = '<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span></p>', {
        json: e,
        raw: n,
        html: a
      } = o.makeContent({
        contentRaw: "@boredKitten",
        contentJson: {},
        contentHtml: t
      }), t = o._makeContentWithMention({
        contentRaw: "@boredKitten",
        contentJson: {},
        contentHtml: t
      });
      expect(a).toEqual(cleanContentHtml(t.contentHtml)), expect(e).toEqual("{}"), 
      expect(n).toEqual("@boredKitten");
    });
  }), describe("makeRichContent", () => {
    it("should return content made by makeContent", async () => {
      var t = '<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span></p>', {
        json: e,
        raw: n,
        html: a
      } = o.makeContent({
        contentRaw: "@boredKitten",
        contentJson: {},
        contentHtml: t
      }), t = await o.makeRichContent({
        contentHtml: t,
        contentRaw: "@boredKitten",
        contentJson: {},
        blocks: []
      });
      expect(a).toEqual(t.content.html), expect(e).toEqual(t.content.json), expect(n).toEqual(t.content.raw);
    }), it("should create a link block if there is a link", async () => {
      var t = await o.makeRichContent({
        contentHtml: '<p><a href="http://pump.com">pump.com</a></p>',
        contentRaw: "@boredKitten",
        contentJson: {},
        blocks: []
      });
      expect(t.blocks.length).toEqual(1);
    });
  });
});