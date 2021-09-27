const Market = artifacts.require("NFT_Market");
const ERC1155 = artifacts.require("TestERC1155");
const ERC20 = artifacts.require("TestERC20");

module.exports = function (deployer) {
  deployer.deploy(Market, 5, 2);
  deployer.deploy(ERC1155);
  deployer.deploy(ERC20);
};
