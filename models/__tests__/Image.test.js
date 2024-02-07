const createDb = require("../../helpers/create-test-db")["createDb"], axios = require("axios").default, Image = (jest.mock("axios"), 
require("../Image"))["Image"];

class File {
  filepath = "/";
  newFilename = "mock";
}

describe("Image tests", () => {
  let e, a;
  beforeEach(() => {
    axios.post.mockReset(), jest.clearAllMocks();
  }), beforeAll(async () => {
    await (e = await createDb()).connect();
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("uploadImage", () => {
    it("should create a new image if successful", async () => {
      axios.post.mockResolvedValue({
        data: {
          data: {
            link: "https://mocklink.com/image.png",
            name: "mock"
          },
          success: !0
        }
      }), await Image.uploadImage({
        image: new File()
      }), a = await Image.findOne({
        src: "https://mocklink.com/image.png"
      }), expect(a).toBeTruthy();
    }), it("should throw an error if API fails", async () => {
      axios.post.mockResolvedValue({
        data: {
          success: !1
        }
      });
      try {
        await Image.uploadImage({
          image: new File()
        });
      } catch (e) {
        expect(e.message).toMatch("Imgur API error");
      }
    });
  });
});