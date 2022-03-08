const Market = artifacts.require("NFTMarketplace");
const ERC1155 = artifacts.require("TestERC1155");
const ERC20 = artifacts.require("TestERC20");
const ERC721 = artifacts.require("TestERC721");
const ERC721_prod = artifacts.require("ERC721_prod");
const ERC1155_prod = artifacts.require("ERC1155_prod");
const Auction = artifacts.require("Auction");
const my_ether = web3.utils.toWei('1', "ether");

module.exports = async function (deployer) {
  await deployer.deploy(Market, 100, (my_ether/20).toString(), "0x09B61CA66838a02e3555a837EefA816598ebAc93");
  await deployer.deploy(Auction, Market.address)
  await deployer.deploy(ERC1155);
  await deployer.deploy(ERC20);
  await deployer.deploy(ERC721);
  await deployer.deploy(ERC721_prod, '');
  await deployer.deploy(ERC1155_prod, '');
};
