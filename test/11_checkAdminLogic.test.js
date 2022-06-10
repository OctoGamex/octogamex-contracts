const NFT1155 = artifacts.require("TestERC1155");
const NFT721 = artifacts.require("TestERC721");
const Tokens = artifacts.require("TestERC20");
const Marketplace = artifacts.require("NFTMarketplace");
const AuctionContract = artifacts.require("Auction");

const {
    BN, 
    expectRevert, 
    time,
    constants
} = require('@openzeppelin/test-helpers');

contract("Marketplace: checking the possibility of adding an admin and the possibilities of an admin", async accounts => {
    const [deployer, adminOne, adminTwo, accountOne, accountTwo] = accounts;

    let firstCollection_1155, firstCollection_721, frstERC20, MarketPlace, Auction;
    let fstClctn_1155Address, fstClctn_721Address, frstERC20Address, MarketPlaceAddress, AuctionAddress;

    before(async () => {
        firstCollection_1155 = await NFT1155.new({from: deployer});
        firstCollection_721 = await NFT721.new({from: deployer});
        frstERC20 = await Tokens.new({from: deployer});

        fstClctn_1155Address = firstCollection_1155.address;
        fstClctn_721Address = firstCollection_721.address;
        frstERC20Address = frstERC20.address;

        MarketPlace = await Marketplace.deployed({from: deployer});
        MarketPlaceAddress = MarketPlace.address;
    });

    it("check possibility of adding collection admin", async () => {
        let isAdmin = true;
        await MarketPlace.setCollectionAdmin(adminOne, isAdmin, { from: deployer });
        let isCollectionAdmin = await MarketPlace.collectionAdmin(adminOne, { from: deployer });
        assert.equal(isCollectionAdmin, isAdmin, "address is not added as collection admin");
    });

    it("check possibility of adding collection by admin", async () => {
        let canTransfer = true;
        await MarketPlace.setNFT_Collection(fstClctn_1155Address, canTransfer, { from: adminOne })       
        let isNFT_Collection = await MarketPlace.NFT_Collections(fstClctn_1155Address);
        assert.equal(isNFT_Collection, true, "adress of collection is not on Marketplace NFT Collections");
    });

    it("check possibility of adding token to collection by admin", async () => {
        let isERC20Supported = true;
        await MarketPlace.setERC20_Support(fstClctn_1155Address, [frstERC20Address], [isERC20Supported], { from: adminOne });
        let isfrstERC20Supports = await MarketPlace.NFT_ERC20_Supports(fstClctn_1155Address, frstERC20Address);
        assert.equal(isfrstERC20Supports, isERC20Supported, "adress of frstERC20 is not supported");
    });

    it("check possibility of adding commision admin", async () => {
        let isAdmin = true;
        await MarketPlace.setCommissionAdmin(adminTwo, isAdmin, { from: deployer });
        let isCommissionAdmin = await MarketPlace.commissionAdmin(adminTwo, { from: deployer });
        assert.equal(isCommissionAdmin, isAdmin, "address is not added as commission admin");
    });

    it("check possibility of adding marketplace commission", async () => {
        let initialMarketCommission = await MarketPlace.marketCommission({from: deployer});
        let marketCommission = new BN(150);

        await MarketPlace.setMarketCommission(marketCommission, { from: adminTwo });
        let newMarketCommision = await MarketPlace.marketCommission({from: adminTwo});

        assert.notEqual(initialMarketCommission, newMarketCommision, "initial and new market commision is the same");
        assert.equal(marketCommission, Number(newMarketCommision), "market commission has not been changed to the new one");
    });

    it("check possibility of adding offer commission", async () => {
        let initialOfferCommission = await MarketPlace.offerCommission({from: deployer});
        const tokenbits = (new BN(10)).pow(new BN(18));
        let offerCommission = new BN(1).mul(tokenbits);
        
        await MarketPlace.setOfferCommission(offerCommission, { from: adminTwo });
        let newOfferCommission = await MarketPlace.offerCommission({from: adminTwo});

        assert.notEqual(initialOfferCommission, newOfferCommission, "initial and new offer commision is the same");
        assert.equal(offerCommission, Number(newOfferCommission), "offer commission has not been changed to the new one");
    });

    it("check possibility of adding collection commission and wallet", async () => {
        let collectionInfo = await MarketPlace.collections(fstClctn_1155Address, { from: deployer });
        let initialCollectionCommission = collectionInfo.commission;
        let initCollectionWalletCommission = collectionInfo.owner;
        let collectionCommission = new BN(2000);

        assert.equal(initialCollectionCommission, 0, "expect initial commission is equal to zero");
        assert.equal(initCollectionWalletCommission, constants.ZERO_ADDRESS, 
            "expect initial wallet for commission is equal to zero address");
               
        await MarketPlace.setCollectionOwner(fstClctn_1155Address, adminOne, { from: adminTwo });
        // assert.notEqual(initCollectionWalletCommission, )

        await MarketPlace.setCollectionCommission(fstClctn_1155Address, collectionCommission, { from: adminTwo });
        let newCollectionInfo = await MarketPlace.collections(fstClctn_1155Address, { from: deployer });
        console.log(Number(newCollectionInfo.commission))
    })
})