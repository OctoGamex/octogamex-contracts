const Market = artifacts.require("NFT_Market");
const ERC1155 = artifacts.require("TestERC1155");
const ERC20 = artifacts.require("TestERC20");

module.exports = function (deployer) {
  deployer.deploy(Market, 90, 2, "0x1202763dc7868d076b0e6424218411C3b6e21f6E");
  deployer.deploy(ERC1155);
  deployer.deploy(ERC20);
};
