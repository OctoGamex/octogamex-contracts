const NFT1155 = artifacts.require("TestERC1155");
const NFT721 = artifacts.require("TestERC721");
const Tokens = artifacts.require("TestERC20");
const Marketplace = artifacts.require("NFTMarketplace");

const {
    BN,
    expectEvent,  
    expectRevert, 
    time
} = require('@openzeppelin/test-helpers');

contract("", async accounts => {
    const [deployer, accountOne, accountTwo] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace;

    let tokenbits;
    let marketComission, comissionOffer;

    const data = 0;

    beforeEach(async () => {
        ERC1155 = await NFT1155.new({from: deployer});
        ERC721 = await NFT721.new({from: deployer});
        ERC20 = await Tokens.new({from: deployer});

        tokenbits = (new BN(10)).pow(new BN(16));
        marketComission = new BN(100);
        comissionOffer = new BN(1).mul(tokenbits);

        MarketPlace = await Marketplace.new(marketComission, comissionOffer, deployer, {from: deployer});

        await ERC1155.mint(accountOne, 1, 100, data, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlace.address, true, { from: accountOne });

        await ERC721.mint(accountOne, 1, { from: accountOne });
        await ERC721.setApprovalForAll(MarketPlace.address, true, { from: accountOne });

        await MarketPlace.setNFT_Collection(ERC1155.address, true, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721.address, true, { from: deployer });
    })

    it("add NFT", async () => {
        // console.log(Number(await ERC1155.balanceOf.call(MarketPlace.address, 1, { from: accountOne })));

        // await MarketPlace.add(ERC1155.address, 1, 10, true, data, { from: accountOne });

        // console.log(Number(await ERC1155.balanceOf.call(MarketPlace.address, 1, { from: accountOne })));

        // await ERC721.approve(MarketPlace.address, 1, { from: accountOne });
        await MarketPlace.add(ERC721.address, 1, 1, true, data, { from: accountOne });
    })
})