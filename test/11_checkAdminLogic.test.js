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
    const [deployer, collectionAdmin, commissionAdmin, accountOne, accountTwo] = accounts;

    let firstCollection_1155, secondCollection_1155, firstCollection_721, secondCollection_721, frstERC20;
    let MarketPlace, Auction;
    let fstClctn_1155Address, scndClctn_1155Address, fstClctn_721Address, scndClctn_721Address, frstERC20Address;
    let MarketPlaceAddress, AuctionAddress;

    before(async () => {
        firstCollection_1155 = await NFT1155.new({from: deployer});
        secondCollection_1155 = await NFT1155.new({from: deployer});
        firstCollection_721 = await NFT721.new({from: deployer});
        secondCollection_721 = await NFT721.new({from: deployer});
        frstERC20 = await Tokens.new({from: deployer});

        fstClctn_1155Address = firstCollection_1155.address;
        scndClctn_1155Address = secondCollection_1155.address;
        fstClctn_721Address = firstCollection_721.address;
        frstERC20Address = frstERC20.address;

        MarketPlace = await Marketplace.deployed({from: deployer});
        MarketPlaceAddress = MarketPlace.address;
    });

    it("check possibility of adding collection-admin", async () => {
        let isAdmin = true;
        await MarketPlace.setCollectionAdmin(collectionAdmin, isAdmin, { from: deployer });

        let isCollectionAdmin = await MarketPlace.collectionAdmin(collectionAdmin, { from: deployer });
        assert.equal(isCollectionAdmin, isAdmin, "address is not added as collection admin");
    });

    it("expect revert if owner try to re-adding collection-admin", async () => {
        let isAdmin = true;
        await expectRevert(
            MarketPlace.setCollectionAdmin(collectionAdmin, isAdmin, { from: deployer }),
            "0"
        );
    });

    it("expect revert if collection-admin try to set commissions", async () => {
        let marketCommission = new BN(100);
        await expectRevert(
            MarketPlace.setMarketCommission(marketCommission, { from: collectionAdmin }),
            "19"
        );

        const tokenbits = (new BN(10)).pow(new BN(18));
        let offerCommission = new BN(3).mul(tokenbits);
        await expectRevert(
            MarketPlace.setOfferCommission(offerCommission, { from: collectionAdmin }),
            "19"
        );

        await expectRevert(
            MarketPlace.setCollectionOwner(fstClctn_1155Address, collectionAdmin, { from: collectionAdmin }),
            "19"
        );

        let collectionCommission = new BN(300);
        await expectRevert(
            MarketPlace.setCollectionCommission(fstClctn_1155Address, collectionCommission, { from: collectionAdmin }),
            "19"
        );
    });

    it("check possibility of adding collection by admin", async () => {
        let canTransfer = true;
        await MarketPlace.setNFT_Collection(fstClctn_1155Address, canTransfer, { from: collectionAdmin });       
        let isNFT_Collection = await MarketPlace.NFT_Collections(fstClctn_1155Address);
        assert.equal(isNFT_Collection, true, "adress of collection is not on Marketplace NFT Collections");
    });

    it("check possibility of adding token to collection by admin", async () => {
        let isERC20Supported = true;
        await MarketPlace.setERC20_Support(fstClctn_1155Address, [frstERC20Address], [isERC20Supported], { from: collectionAdmin });
        let isfrstERC20Supports = await MarketPlace.NFT_ERC20_Supports(fstClctn_1155Address, frstERC20Address, { from: collectionAdmin });
        assert.equal(isfrstERC20Supports, isERC20Supported, "adress of frstERC20 is not supported");
    });

    it("check possibility of adding commission-admin", async () => {
        let isAdmin = true;
        await MarketPlace.setCommissionAdmin(commissionAdmin, isAdmin, { from: deployer });

        let isCommissionAdmin = await MarketPlace.commissionAdmin(commissionAdmin, { from: deployer });
        assert.equal(isCommissionAdmin, isAdmin, "address is not added as commission admin");
    });

    it("expect revert if owner try to re-adding commission-admin", async () => {
        let isAdmin = true;

        await expectRevert(
            MarketPlace.setCommissionAdmin(commissionAdmin, isAdmin, { from: deployer }),
            "0"
        );
    });

    it("expect revert if commission-admin try to add collection or token for collection", async () => {
        let canTransfer = true;
        await expectRevert(
            MarketPlace.setNFT_Collection(fstClctn_1155Address, canTransfer, { from: commissionAdmin }),
            "19"
        );

        let isERC20Supported = true;
        await expectRevert(
            MarketPlace.setERC20_Support(fstClctn_1155Address, [frstERC20Address], [isERC20Supported], { from: commissionAdmin }),
            "19"
        );
    });

    it("check possibility of adding marketplace commission", async () => {
        let initialMarketCommission = await MarketPlace.marketCommission({from: deployer});
        let marketCommission = new BN(150);

        await MarketPlace.setMarketCommission(marketCommission, { from: commissionAdmin });
        let newMarketCommision = await MarketPlace.marketCommission({from: commissionAdmin});

        assert.notEqual(initialMarketCommission, newMarketCommision, "initial and new market commision is the same");
        assert.equal(marketCommission, Number(newMarketCommision), "market commission has not been changed to the new one");
    });

    it("check possibility of adding offer commission", async () => {
        let initialOfferCommission = await MarketPlace.offerCommission({from: deployer});
        const tokenbits = (new BN(10)).pow(new BN(18));
        let offerCommission = new BN(1).mul(tokenbits);
        
        await MarketPlace.setOfferCommission(offerCommission, { from: commissionAdmin });
        let newOfferCommission = await MarketPlace.offerCommission({from: commissionAdmin});

        assert.notEqual(initialOfferCommission, newOfferCommission, "initial and new offer commision is the same");
        assert.equal(offerCommission, Number(newOfferCommission), "offer commission has not been changed to the new one");
    });

    it("check possibility of adding collection commission and wallet", async () => {
        let collectionInfo = await MarketPlace.collections(fstClctn_1155Address, { from: deployer });
        let initCollectionCommission = collectionInfo.commission;
        let initCollectionWalletCommission = collectionInfo.owner;
        let collectionCommission = new BN(200);

        assert.equal(initCollectionCommission, 0, "expect initial commission is equal to zero");
        assert.equal(initCollectionWalletCommission, constants.ZERO_ADDRESS, 
            "expect initial wallet for commission is equal to zero address");
        
        // set new wallet for collection
        await MarketPlace.setCollectionOwner(fstClctn_1155Address, collectionAdmin, { from: commissionAdmin });

        let newCollectionInfo = await MarketPlace.collections(fstClctn_1155Address, { from: deployer });
        let newCollectionWalletCommission = newCollectionInfo.owner;

        assert.notEqual(initCollectionWalletCommission, collectionAdmin, 
            "expect initial wallet for collection commission is not equal to new one");
        assert.equal(collectionAdmin, newCollectionWalletCommission, 
            "new wallet for commission has not been changed to the new one");

        // set new collection commission
        await MarketPlace.setCollectionCommission(fstClctn_1155Address, collectionCommission, { from: commissionAdmin });
        
        newCollectionInfo = await MarketPlace.collections(fstClctn_1155Address, { from: deployer });
        let newCollectionCommission = newCollectionInfo.commission;

        assert.notEqual(initCollectionWalletCommission, collectionCommission, 
            "expect initial commission for collection is not equal to new one");
        assert.equal(collectionCommission, Number(newCollectionCommission), 
            "new commission for collection has not been changed to the new one");
    });

    

    it("owner should have possibility to take collection-admin rights back", async () => {
        let isAdmin = false;
        await MarketPlace.setCollectionAdmin(collectionAdmin, isAdmin, { from: deployer });

        let isCollectionAdmin = await MarketPlace.collectionAdmin(collectionAdmin, { from: deployer });
        assert.equal(isCollectionAdmin, isAdmin, "address is not deleted as collection admin");
    });

    it("expect revert if deleted collection-admin adding collection", async () => {
        let canTransfer = true;
        await expectRevert( 
            MarketPlace.setNFT_Collection(fstClctn_1155Address, canTransfer, { from: collectionAdmin }),
            "19"
        );
    });

    it("expect revert if deleted collection-admin adding token to collection", async () => {
        let isERC20Supported = true;
        await expectRevert( 
            MarketPlace.setERC20_Support(fstClctn_1155Address, [frstERC20Address], [isERC20Supported], { from: collectionAdmin }),
            "19"
        );
    });

    it("owner should have possibility to take commission-admin rights back", async () => {
        let isAdmin = false;
        await MarketPlace.setCommissionAdmin(commissionAdmin, isAdmin, { from: deployer });

        let isCommissionAdmin = await MarketPlace.commissionAdmin(commissionAdmin, { from: deployer });
        assert.equal(isCommissionAdmin, isAdmin, "address is not deleted as commission admin");
    });

    it("expect revert if deleted commission-admin adding marketplace commission", async () => {
        let marketCommission = new BN(200);

        await expectRevert(
            MarketPlace.setMarketCommission(marketCommission, { from: commissionAdmin }),
            "19"
        );       
    });

    it("expect revert if deleted commission-admin adding offer commission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let offerCommission = new BN(2).mul(tokenbits);
        
        await expectRevert(
            MarketPlace.setOfferCommission(offerCommission, { from: commissionAdmin }),
            "19"
        );
    });

    it("expect revert if deleted commission-admin adding collection wallet for commission", async () => {
        await expectRevert(
            MarketPlace.setCollectionOwner(fstClctn_1155Address, collectionAdmin, { from: commissionAdmin }),
            "19"
        );
    });

    it("expect revert if deleted commission-admin adding collection commission", async () => {
        let collectionCommission = new BN(300);

        await expectRevert(
            MarketPlace.setCollectionCommission(fstClctn_1155Address, collectionCommission, { from: commissionAdmin }),
            "19"
        );
    });

    it("expect revert if admins are not added by the owner, but by other admins", async () => {
        let isAdmin = true;
        await expectRevert(
            MarketPlace.setCollectionAdmin(collectionAdmin, isAdmin, { from: commissionAdmin }),
            "Ownable: caller is not the owner"
        );

        await expectRevert(
            MarketPlace.setCommissionAdmin(commissionAdmin, isAdmin, { from: collectionAdmin }),
            "Ownable: caller is not the owner"
        );
    });

    it("expect revert if owner adding zero addresses as commission-admin", async () => {
        let isAdmin = true;
 
        await expectRevert(
            MarketPlace.setCommissionAdmin(constants.ZERO_ADDRESS, isAdmin, { from: deployer }),
            "0"
        );
    })

    it("expect revert if owner adding zero addresses as collection-admin", async () => {
        let isAdmin = true;
        
        await expectRevert(
            MarketPlace.setCollectionAdmin(constants.ZERO_ADDRESS, isAdmin, { from: deployer }),
            "0"
        );
    })
})