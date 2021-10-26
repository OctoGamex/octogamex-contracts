const Market = artifacts.require("NFTMarketplace");
const ERC1155 = artifacts.require("TestERC1155");
const ERC20 = artifacts.require("TestERC20");
const ERC721 = artifacts.require("TestERC721");
const my_ether = web3.utils.toWei('1', "ether");
module.exports = function (deployer) {
  deployer.deploy(Market, 100, (my_ether/20).toString(), "0x09B61CA66838a02e3555a837EefA816598ebAc93");
  deployer.deploy(ERC1155);
  deployer.deploy(ERC20);
  deployer.deploy(ERC721);
};
