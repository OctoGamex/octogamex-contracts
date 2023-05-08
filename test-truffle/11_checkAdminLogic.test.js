const NFT1155 = artifacts.require("TestERC1155");
const NFT721 = artifacts.require("TestERC721");
const Tokens = artifacts.require("TestERC20");
const Marketplace = artifacts.require("NFTMarketplace");
const Admin = artifacts.require("Admin");

const {
    BN, 
    expectRevert, 
    time,
    constants
} = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');

contract("Marketplace: checking the possibility of adding an admin and the possibilities of an admin", async accounts => {
    const [deployer, collectionAdmin, commissionAdmin, accountOne, accountTwo] = accounts;

    let MarketPlace, AdminContract;
    let MarketPlaceAddress, AdminContractAddress;
    let firstCollection_1155, secondCollection_1155, firstCollection_721, frstERC20;
    let fstClctn_1155Address, scndClctn_1155Address, fstClctn_721Address, frstERC20Address;

    before(async () => {
        firstCollection_1155 = await NFT1155.new({from: deployer});
        secondCollection_1155 = await NFT1155.new({from: deployer});
        firstCollection_721 = await NFT721.new({from: deployer});
        frstERC20 = await Tokens.new({from: deployer});

        fstClctn_1155Address = firstCollection_1155.address;
        scndClctn_1155Address = secondCollection_1155.address;
        fstClctn_721Address = firstCollection_721.address;
        frstERC20Address = frstERC20.address;

        AdminContract = await Admin.deployed({from: deployer});
        AdminContractAddress = AdminContract.address;

        MarketPlace = await Marketplace.deployed({from: deployer});
        MarketPlaceAddress = MarketPlace.address;

        await AdminContract.setMarketContract(MarketPlaceAddress, { from: deployer });
    });

    it("check possibility of adding collection-admin", async () => {
        let isAdmin = true;
        await AdminContract.setCollectionAdmin(collectionAdmin, isAdmin, { from: deployer });

        let isCollectionAdmin = await AdminContract.collectionAdmin(collectionAdmin, { from: deployer });
        assert.equal(isCollectionAdmin, isAdmin, "address is not added as collection admin");
    });

    it("expect revert if owner try to re-adding collection-admin", async () => {
        let isAdmin = true;
        await expectRevert(
            AdminContract.setCollectionAdmin(collectionAdmin, isAdmin, { from: deployer }),
            "0"
        );
    });

    it("expect revert if collection-admin try to set commissions", async () => {
        let marketCommission = new BN(100);
        await expectRevert(
            AdminContract.setMarketCommission(marketCommission, { from: collectionAdmin }),
            "19"
        );

        const tokenbits = (new BN(10)).pow(new BN(18));
        let offerCommission = new BN(3).mul(tokenbits);
        await expectRevert(
            AdminContract.setOfferCommission(offerCommission, { from: collectionAdmin }),
            "19"
        );

        await expectRevert(
            AdminContract.setCollectionOwner(fstClctn_1155Address, collectionAdmin, { from: collectionAdmin }),
            "19"
        );

        await expectRevert(
            AdminContract.setCollectionOwner(fstClctn_721Address, collectionAdmin, { from: collectionAdmin }),
            "19"
        );

        let collectionCommission = new BN(300);
        await expectRevert(
            AdminContract.setCollectionCommission(fstClctn_1155Address, collectionCommission, { from: collectionAdmin }),
            "19"
        );

        await expectRevert(
            AdminContract.setCollectionCommission(fstClctn_721Address, collectionCommission, { from: collectionAdmin }),
            "19"
        );
    });

    it("check possibility of adding collection by admin", async () => {
        let canTransfer = true;
        let receipt = await AdminContract.setNFT_Collection(fstClctn_1155Address, canTransfer, { from: collectionAdmin });
        
        expectEvent(receipt, 'collectionAdd', {
            auctionContract: fstClctn_1155Address,
            canTransfer: canTransfer
        });

        let isNFT_Collection = await AdminContract.NFT_Collections(fstClctn_1155Address);
        assert.equal(isNFT_Collection, true, "adress of collection is not on Marketplace NFT Collections");
    });

    it("check possibility of adding token to collection by admin", async () => {
        let isERC20Supported = true;
        await AdminContract.setERC20_Support(fstClctn_1155Address, [frstERC20Address], [isERC20Supported], { from: collectionAdmin });
        let isfrstERC20Supports = await AdminContract.NFT_ERC20_Supports(fstClctn_1155Address, frstERC20Address, { from: collectionAdmin });
        assert.equal(isfrstERC20Supports, isERC20Supported, "adress of frstERC20 is not supported");
    });

    it("check possibility of adding commission-admin", async () => {
        let isAdmin = true;
        await AdminContract.setCommissionAdmin(commissionAdmin, isAdmin, { from: deployer });

        let isCommissionAdmin = await AdminContract.commissionAdmin(commissionAdmin, { from: deployer });
        assert.equal(isCommissionAdmin, isAdmin, "address is not added as commission admin");
    });

    it("expect revert if owner try to re-adding commission-admin", async () => {
        let isAdmin = true;

        await expectRevert(
            AdminContract.setCommissionAdmin(commissionAdmin, isAdmin, { from: deployer }),
            "0"
        );
    });

    it("expect revert if commission-admin try to add collection or token for collection", async () => {
        let canTransfer = true;
        await expectRevert(
            AdminContract.setNFT_Collection(fstClctn_1155Address, canTransfer, { from: commissionAdmin }),
            "19"
        );

        let isERC20Supported = true;
        await expectRevert(
            AdminContract.setERC20_Support(fstClctn_1155Address, [frstERC20Address], [isERC20Supported], { from: commissionAdmin }),
            "19"
        );
    });

    it("expect revert if commission-admin try to change commission wallet", async () => {
        await expectRevert(
            MarketPlace.setWallet(commissionAdmin, { from: commissionAdmin }),
            "Ownable: caller is not the owner"
        );
    });

    it("check possibility of adding marketplace commission", async () => {
        let initialMarketCommission = await AdminContract.marketCommission({from: deployer});
        let marketCommission = new BN(150);

        let receipt = await AdminContract.setMarketCommission(marketCommission, { from: commissionAdmin });

        expectEvent(receipt, 'commissionMarket', {
            commisssion: marketCommission
        });

        let newMarketCommision = await AdminContract.marketCommission({from: commissionAdmin});

        assert.notEqual(initialMarketCommission, newMarketCommision, "initial and new market commision is the same");
        assert.equal(marketCommission, Number(newMarketCommision), "market commission has not been changed to the new one");
    });

    it("check possibility of adding offer commission", async () => {
        let initialOfferCommission = await AdminContract.offerCommission({from: deployer});
        const tokenbits = (new BN(10)).pow(new BN(18));
        let offerCommission = new BN(1).mul(tokenbits);
        
        let receipt = await AdminContract.setOfferCommission(offerCommission, { from: commissionAdmin });

        expectEvent(receipt, 'commissionOffer', {
            commisssion: offerCommission
        });

        let newOfferCommission = await AdminContract.offerCommission({from: commissionAdmin});

        assert.notEqual(initialOfferCommission, newOfferCommission, "initial and new offer commision is the same");
        assert.equal(offerCommission, Number(newOfferCommission), "offer commission has not been changed to the new one");
    });

    it("check possibility of adding collection commission and wallet", async () => {
        let collectionInfo = await AdminContract.collections(fstClctn_1155Address, { from: deployer });
        let initCollectionCommission = collectionInfo.commission;
        let initCollectionWalletCommission = collectionInfo.owner;
        let collectionCommission = new BN(200);

        assert.equal(initCollectionCommission, 0, "expect initial commission is equal to zero");
        assert.equal(initCollectionWalletCommission, constants.ZERO_ADDRESS, 
            "expect initial wallet for commission is equal to zero address");
        
        // set new wallet for collection
        await AdminContract.setCollectionOwner(fstClctn_1155Address, collectionAdmin, { from: commissionAdmin });

        let newCollectionInfo = await AdminContract.collections(fstClctn_1155Address, { from: deployer });
        let newCollectionWalletCommission = newCollectionInfo.owner;

        assert.notEqual(initCollectionWalletCommission, collectionAdmin, 
            "expect initial wallet for collection commission is not equal to new one");
        assert.equal(collectionAdmin, newCollectionWalletCommission, 
            "new wallet for commission has not been changed to the new one");

        // set new collection commission
        let commisionReceipt = await AdminContract.setCollectionCommission(fstClctn_1155Address, collectionCommission, { from: commissionAdmin });

        expectEvent(commisionReceipt, 'commissionCollection', {
            contractNFT: fstClctn_1155Address,
            commisssion: collectionCommission
        });
        
        newCollectionInfo = await AdminContract.collections(fstClctn_1155Address, { from: deployer });
        let newCollectionCommission = newCollectionInfo.commission;

        assert.notEqual(initCollectionWalletCommission, collectionCommission, 
            "expect initial commission for collection is not equal to new one");
        assert.equal(collectionCommission, Number(newCollectionCommission), 
            "new commission for collection has not been changed to the new one");
    });

    

    it("owner should have possibility to take collection-admin rights back", async () => {
        let isAdmin = false;
        await AdminContract.setCollectionAdmin(collectionAdmin, isAdmin, { from: deployer });

        let isCollectionAdmin = await AdminContract.collectionAdmin(collectionAdmin, { from: deployer });
        assert.equal(isCollectionAdmin, isAdmin, "address is not deleted as collection admin");
    });

    it("expect revert if deleted collection-admin adding collection", async () => {
        let canTransfer = true;
        await expectRevert( 
            AdminContract.setNFT_Collection(fstClctn_1155Address, canTransfer, { from: collectionAdmin }),
            "19"
        );
    });

    it("expect revert if deleted collection-admin adding token to collection", async () => {
        let isERC20Supported = true;
        await expectRevert( 
            AdminContract.setERC20_Support(fstClctn_1155Address, [frstERC20Address], [isERC20Supported], { from: collectionAdmin }),
            "19"
        );
    });

    it("owner should have possibility to take commission-admin rights back", async () => {
        let isAdmin = false;
        await AdminContract.setCommissionAdmin(commissionAdmin, isAdmin, { from: deployer });

        let isCommissionAdmin = await AdminContract.commissionAdmin(commissionAdmin, { from: deployer });
        assert.equal(isCommissionAdmin, isAdmin, "address is not deleted as commission admin");
    });

    it("expect revert if deleted commission-admin adding marketplace commission", async () => {
        let marketCommission = new BN(200);

        await expectRevert(
            AdminContract.setMarketCommission(marketCommission, { from: commissionAdmin }),
            "19"
        );       
    });

    it("expect revert if deleted commission-admin adding offer commission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let offerCommission = new BN(2).mul(tokenbits);
        
        await expectRevert(
            AdminContract.setOfferCommission(offerCommission, { from: commissionAdmin }),
            "19"
        );
    });

    it("expect revert if deleted commission-admin adding collection wallet for commission", async () => {
        await expectRevert(
            AdminContract.setCollectionOwner(fstClctn_1155Address, collectionAdmin, { from: commissionAdmin }),
            "19"
        );
    });

    it("expect revert if deleted commission-admin adding collection commission", async () => {
        let collectionCommission = new BN(300);

        await expectRevert(
            AdminContract.setCollectionCommission(fstClctn_1155Address, collectionCommission, { from: commissionAdmin }),
            "19"
        );
    });

    it("expect revert if admins are not added by the owner, but by other admins", async () => {
        let isAdmin = true;
        await expectRevert(
            AdminContract.setCollectionAdmin(collectionAdmin, isAdmin, { from: commissionAdmin }),
            "Ownable: caller is not the owner"
        );

        await expectRevert(
            AdminContract.setCommissionAdmin(commissionAdmin, isAdmin, { from: collectionAdmin }),
            "Ownable: caller is not the owner"
        );
    });

    it("expect revert if owner adding zero addresses as commission-admin", async () => {
        let isAdmin = true;
 
        await expectRevert(
            AdminContract.setCommissionAdmin(constants.ZERO_ADDRESS, isAdmin, { from: deployer }),
            "0"
        );
    });

    it("expect revert if owner adding zero addresses as collection-admin", async () => {
        let isAdmin = true;
        
        await expectRevert(
            AdminContract.setCollectionAdmin(constants.ZERO_ADDRESS, isAdmin, { from: deployer }),
            "0"
        );
    });

    it(`check that owner can add himself to collection-admin, but don't add to commission-admin 
        and try to add collection and change commission`, async () => {

        let isAdmin = true;
        await AdminContract.setCollectionAdmin(deployer, isAdmin, { from: deployer });

        let canTransfer = true;
        let setCollectionReceipt = await AdminContract.setNFT_Collection(scndClctn_1155Address, canTransfer, { from: deployer });
        
        expectEvent(setCollectionReceipt, 'collectionAdd', {
            auctionContract: scndClctn_1155Address,
            canTransfer: canTransfer
        });

        let isNFT_Collection = await AdminContract.NFT_Collections(scndClctn_1155Address);
        assert.equal(isNFT_Collection, true, "adress of collection is not on Marketplace NFT Collections");

        let collectionCommission = new BN(250);

        let commisionReceipt = await AdminContract.setCollectionCommission(fstClctn_1155Address, collectionCommission, { from: deployer });

        expectEvent(commisionReceipt, 'commissionCollection', {
            contractNFT: fstClctn_1155Address,
            commisssion: collectionCommission
        });

        let newCollectionInfo = await AdminContract.collections(fstClctn_1155Address, { from: deployer });
        let newCollectionCommission = newCollectionInfo.commission;

        assert.equal(collectionCommission, Number(newCollectionCommission), 
            "new commission for collection has not been changed to the new one");

        const tokenbits = (new BN(10)).pow(new BN(18));
        let offerCommission = new BN(3).mul(tokenbits);
        
        let receipt = await AdminContract.setOfferCommission(offerCommission, { from: deployer });

        expectEvent(receipt, 'commissionOffer', {
            commisssion: offerCommission
        });

        let newOfferCommission = await AdminContract.offerCommission({from: deployer});
        assert.equal(offerCommission, Number(newOfferCommission), "offer commission has not been changed to the new one");
    });
})