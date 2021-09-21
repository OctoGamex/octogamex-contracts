const Market = artifacts.require("NFT_Market");
const ERC = artifacts.require("TestERC");

module.exports = function (deployer) {
  deployer.deploy(Market);
  deployer.deploy(ERC);
};
