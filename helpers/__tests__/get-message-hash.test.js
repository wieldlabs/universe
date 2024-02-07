const ethers = require("ethers")["ethers"], getMessageHash = (jest.useFakeTimers(), 
require("../get-message-hash"))["getMessageHash"], getRandomAddress = require("../get-random-address")["getRandomAddress"], wallet = require("../test-sign-wallet")["wallet"];

describe("Get message hash tests", () => {
  let t = getRandomAddress(), a = ethers.utils.parseUnits("0.0001", 18), r = getRandomAddress();
  it("should decode the correct hash", async () => {
    var e = getMessageHash(t, a, 1, r), s = await wallet.signMessage(e), e = ethers.utils.verifyMessage(e, s);
    expect(e).toBe(wallet.address);
  });
});