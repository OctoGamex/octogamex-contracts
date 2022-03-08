const NFT1155 = artifacts.require("TestERC1155");
const NFT721 = artifacts.require("TestERC721");
const Tokens = artifacts.require("TestERC20");
const Marketplace = artifacts.require("NFTMarketplace");
const AuctionContract = artifacts.require("Auction");

const {
    BN,
    expectEvent,  
    expectRevert, 
    time,
    constants
} = require('@openzeppelin/test-helpers');

contract("collection commission functionality", async accounts => {
    // commission - wallet for collection commission
    const [deployer, commissionNFT1155, commissionNFT721, accountOne, accountTwo, accountThree, accountFour] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace, Auction;
    let ERC1155Address, ERC721Address, ERC20Address, MarketPlaceAddress, AuctionAddress;

    let commissionOffer;

    let addNFT721Num = 10;
    let accFourNFT721Num = 52;

    const accTwoNFT1155id = new BN(1);
    const accThreeNFT1155id = new BN(2);
    const accFourNFT1155id = new BN(3);
    let NFT721ids = []; 
    let accFourNFT721ids = [];
    const NFTdata = 0; 

    let winningBetsNFT721 = [];
    let winningBetsNFT1155 = [];

    let collectionCommission = new BN(200);

    before(async () => {
        ERC1155 = await NFT1155.new({from: deployer});
        ERC721 = await NFT721.new({from: deployer});
        ERC20 = await Tokens.new({from: deployer});

        ERC1155Address = ERC1155.address;
        ERC721Address = ERC721.address;
        ERC20Address = ERC20.address;

        MarketPlace = await Marketplace.deployed({from: deployer});
        MarketPlaceAddress = MarketPlace.address;

        Auction = await AuctionContract.new(MarketPlaceAddress, {from: deployer});
        AuctionAddress = Auction.address;

        let canTransfer = false;
        await MarketPlace.setAuctionContract(AuctionAddress, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });

        let isERC20Supported = true;
        await MarketPlace.setERC20_Support(ERC1155Address, [ERC20Address], [isERC20Supported], { from: deployer });
        await MarketPlace.setERC20_Support(ERC721Address, [ERC20Address], [isERC20Supported], { from: deployer });

        // await MarketPlace.setCollectionOwner(ERC1155Address, commissionNFT1155, { from: deployer });
    });

    it("expect revert if setCollectionOwner func call not owner for NFT 1155", async () => {
        await expectRevert(
            MarketPlace.setCollectionOwner(ERC1155Address, commissionNFT1155, { from: commissionNFT1155 }),
            "Ownable: caller is not the owner"
        );
    });

    it("expect revert if setCollectionOwner func call not owner for NFT 1155", async () => {
        await expectRevert(
            MarketPlace.setCollectionCommission(ERC1155Address, collectionCommission, { from: commissionNFT1155 }),
            "Ownable: caller is not the owner"
        );
    });

    it("expect revert if setCollectionOwner func call not owner for NFT 721", async () => {
        await expectRevert(
            MarketPlace.setCollectionOwner(ERC721Address, commissionNFT721, { from: commissionNFT721 }),
            "Ownable: caller is not the owner"
        );
    });

    it("expect revert if setCollectionOwner func call not owner for NFT 721", async () => {
        await expectRevert(
            MarketPlace.setCollectionCommission(ERC721Address, collectionCommission, { from: commissionNFT721 }),
            "Ownable: caller is not the owner"
        );
    });

    it("expect revert func setCollectionOwner if setNFT_Collection is false for NFT 1155", async () => {
        await expectRevert(
            MarketPlace.setCollectionOwner(ERC1155Address, commissionNFT1155, { from: deployer }),
            "revert"
        );
    });

    it("expect revert func setCollectionOwner if setNFT_Collection is false for NFT 721", async () => {
        await expectRevert(
            MarketPlace.setCollectionOwner(ERC721Address, commissionNFT721, { from: deployer }),
            "revert"
        );
    });

    it("expect revert func setCollectionCommission if setNFT_Collection is false for NFT 1155", async () => {
        await expectRevert(
            MarketPlace.setCollectionCommission(ERC1155Address, collectionCommission, { from: deployer }),
            "revert"
        );
    });

    it("expect revert func setCollectionCommission if setNFT_Collection is false for NFT 721", async () => {
        await expectRevert(
            MarketPlace.setCollectionCommission(ERC721Address, collectionCommission, { from: deployer }),
            "revert"
        );
    });

    it("setNFT_Collection, setCollectionOwner & setCollectionCommission", async () => {
        let canTransfer = true;
        await MarketPlace.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });

        await MarketPlace.setCollectionOwner(ERC1155Address, commissionNFT1155, { from: deployer });
        await MarketPlace.setCollectionOwner(ERC721Address, commissionNFT721, { from: deployer });

        await MarketPlace.setCollectionCommission(ERC1155Address, collectionCommission, { from: deployer });
        await MarketPlace.setCollectionCommission(ERC721Address, collectionCommission, { from: deployer });
    });
});