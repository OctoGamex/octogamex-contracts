const Market = artifacts.require("NFT_Market");
const ERC = artifacts.require("TestERC");

module.exports = function (deployer) {
  deployer.deploy(Market, 5);
  deployer.deploy(ERC);
};
