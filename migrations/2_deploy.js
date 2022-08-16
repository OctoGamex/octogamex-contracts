const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const NFTMarketplaceUpgradeable = artifacts.require("NFTMarketplaceUpgradeable");

// const Market = artifacts.require("NFTMarketplace");
// const ERC1155 = artifacts.require("TestERC1155");
// const ERC20 = artifacts.require("TestERC20");
// const ERC20_prod = artifacts.require("ERC20_prod");
// const ERC721 = artifacts.require("TestERC721");
// const ERC721_prod = artifacts.require("ERC721_prod");
// const ERC1155_prod = artifacts.require("ERC1155_prod");
// const Auction = artifacts.require("Auction");
// const Admin = artifacts.require("Admin");
// const my_ether = web3.utils.toWei('1', "ether");
//
//
// const Vesting = artifacts.require("Vesting");
// const Rewards = artifacts.require("Rewards");

module.exports = async function (deployer) {
  // await deployer.deploy(Admin, 100, (my_ether/20).toString());
  // await deployer.deploy(Market, "0x598511d4087b3F48B270De0FEC4bb930faB0A98c", Admin.address);
  // await deployer.deploy(Auction, Market.address, Admin.address);
  // await deployer.deploy(ERC1155);
  // await deployer.deploy(ERC20);
  // await deployer.deploy(ERC20_prod);
  // await deployer.deploy(ERC721);
  // await deployer.deploy(ERC721_prod, '');
  // await deployer.deploy(ERC1155_prod, '');


  // await deployProxy(NFTMarketplaceUpgradeable,[deployer, deployer], {
  //   initializer: 'initialize'
  // })

  // await deployer.deploy(Vesting);
  // await deployer.deploy(Rewards, ERC20.address, ERC20.address , Vesting.address, '0x598511d4087b3F48B270De0FEC4bb930faB0A98c' );

};
