const MockProvider = require("ethereum-waffle")["MockProvider"], provider = new MockProvider();

let wallet;

[ wallet ] = provider.getWallets();

const getSignedMessage = async e => {
  e = `@wieldlabs/universe wants you to sign in with your Ethereum account, secured with a signed message:
 ${e.length} ` + e;
  return {
    message: await wallet.signMessage(e),
    address: wallet.address
  };
};

module.exports = {
  getSignedMessage: getSignedMessage,
  wallet: wallet
};