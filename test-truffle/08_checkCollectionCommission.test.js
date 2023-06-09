const NFT1155 = artifacts.require("TestERC1155");
const NFT721 = artifacts.require("TestERC721");
const Tokens = artifacts.require("TestERC20");
const Marketplace = artifacts.require("NFTMarketplace");
const AuctionContract = artifacts.require("Auction");
const Admin = artifacts.require("Admin");

const {
    BN,
    expectEvent,  
    expectRevert, 
    time,
    constants
} = require('@openzeppelin/test-helpers');

contract("collection commission functionality", async accounts => {
    // commission - wallet for collection commission
    const [deployer, walletCommission1155, walletCommission721, accountOne, accountTwo, accountThree, accountFour] = accounts;

    let MarketPlace, Auction, AdminContract;
    let MarketPlaceAddress, AuctionAddress, AdminContractAddress;

    let ERC1155, ERC721, ERC20;
    let ERC1155Address, ERC721Address, ERC20Address;

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

        AdminContract = await Admin.deployed({from: deployer});
        AdminContractAddress = AdminContract.address;

        MarketPlace = await Marketplace.deployed({from: deployer});
        MarketPlaceAddress = MarketPlace.address;

        await AdminContract.setMarketContract(MarketPlaceAddress, { from: deployer });

        Auction = await AuctionContract.new(MarketPlaceAddress, AdminContractAddress, {from: deployer});
        AuctionAddress = Auction.address;  
        await MarketPlace.setAuctionContract(AuctionAddress, { from: deployer });

        let canTransfer = false;
        let collection1155Receipt = await AdminContract.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });

        expectEvent(collection1155Receipt, 'collectionAdd', {
            auctionContract: ERC1155Address,
            canTransfer: canTransfer
        });

        let collection721Receipt = await AdminContract.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });

        expectEvent(collection721Receipt, 'collectionAdd', {
            auctionContract: ERC721Address,
            canTransfer: canTransfer
        });

        let isERC20Supported = true;
        await AdminContract.setERC20_Support(ERC1155Address, [ERC20Address], [isERC20Supported], { from: deployer });
        await AdminContract.setERC20_Support(ERC721Address, [ERC20Address], [isERC20Supported], { from: deployer });

        // await MarketPlace.setCollectionOwner(ERC1155Address, walletCommission1155, { from: deployer });
    });

    it("expect revert if setCollectionOwner func call not owner for NFT 1155", async () => {
        await expectRevert(
            AdminContract.setCollectionOwner(ERC1155Address, walletCommission1155, { from: walletCommission1155 }),
            "19"
        );
    });

    it("expect revert if setCollectionOwner func call not owner for NFT 1155", async () => {
        await expectRevert(
            AdminContract.setCollectionCommission(ERC1155Address, collectionCommission, { from: walletCommission1155 }),
            "19"
        );
    });

    it("expect revert if setCollectionOwner func call not owner for NFT 721", async () => {
        await expectRevert(
            AdminContract.setCollectionOwner(ERC721Address, walletCommission721, { from: walletCommission721 }),
            "19"
        );
    });

    it("expect revert if setCollectionOwner func call not owner for NFT 721", async () => {
        await expectRevert(
            AdminContract.setCollectionCommission(ERC721Address, collectionCommission, { from: walletCommission721 }),
            "19"
        );
    });

    it("expect revert func setCollectionOwner if setNFT_Collection is false for NFT 1155", async () => {
        await expectRevert(
            AdminContract.setCollectionOwner(ERC1155Address, walletCommission1155, { from: deployer }),
            "revert"
        );
    });

    it("expect revert func setCollectionOwner if setNFT_Collection is false for NFT 721", async () => {
        await expectRevert(
            AdminContract.setCollectionOwner(ERC721Address, walletCommission721, { from: deployer }),
            "revert"
        );
    });

    it("expect revert func setCollectionCommission if setNFT_Collection is false for NFT 1155", async () => {
        await expectRevert(
            AdminContract.setCollectionCommission(ERC1155Address, collectionCommission, { from: deployer }),
            "revert"
        );
    });

    it("expect revert func setCollectionCommission if setNFT_Collection is false for NFT 721", async () => {
        await expectRevert(
            AdminContract.setCollectionCommission(ERC721Address, collectionCommission, { from: deployer }),
            "revert"
        );
    });

    it("set NFT collections & set wallets for commission of collections", async () => {
        let canTransfer = true;
        let collection1155Receipt = await AdminContract.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });

        expectEvent(collection1155Receipt, 'collectionAdd', {
            auctionContract: ERC1155Address,
            canTransfer: canTransfer
        });

        let collection721Receipt = await AdminContract.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });

        expectEvent(collection721Receipt, 'collectionAdd', {
            auctionContract: ERC721Address,
            canTransfer: canTransfer
        });

        // 1155
        let coll_1155_InfoBefore = await AdminContract.collections(ERC1155Address, { from: deployer });
        let initColl_1155_Wallet = coll_1155_InfoBefore.owner;

        assert.equal(initColl_1155_Wallet, constants.ZERO_ADDRESS, 
            "expect initial wallet for commission is equal to zero address");

        // 721
        let coll_721_InfoBefore = await AdminContract.collections(ERC721Address, { from: deployer });
        let initColl_721_Wallet = coll_721_InfoBefore.owner;
    
        assert.equal(initColl_721_Wallet, constants.ZERO_ADDRESS, 
            "expect initial wallet for commission is equal to zero address");

        await AdminContract.setCollectionOwner(ERC1155Address, walletCommission1155, { from: deployer });
        await AdminContract.setCollectionOwner(ERC721Address, walletCommission721, { from: deployer });

        // 1155
        let coll_1155_InfoAfter = await AdminContract.collections(ERC1155Address, { from: deployer });
        let newColl_1155_Wallet = coll_1155_InfoAfter.owner;

        assert.equal(newColl_1155_Wallet, walletCommission1155, "wallet for collection commission is wrong");

        // 721
        let coll_721_InfoAfter = await AdminContract.collections(ERC721Address, { from: deployer });
        let newColl_721_Wallet = coll_721_InfoAfter.owner;

        assert.equal(newColl_721_Wallet, walletCommission721, "wallet for collection commission is wrong");
    });

    it("set collection commission", async () => {
        // 1155
        let coll_1155_InfoBefore = await AdminContract.collections(ERC1155Address, { from: deployer });
        let initColl_1155_Commission = coll_1155_InfoBefore.commission;

        assert.equal(initColl_1155_Commission, 0, 
            "expect initial commission for collection is equal to zero");

        // 721
        let coll_721_InfoBefore = await AdminContract.collections(ERC721Address, { from: deployer });
        let initColl_721_Commission = coll_721_InfoBefore.commission;
    
        assert.equal(initColl_721_Commission, 0, 
            "expect initial commission for collection is equal to zero");

        let collComsn1155 = await AdminContract.setCollectionCommission(ERC1155Address, collectionCommission, { from: deployer });

        expectEvent(collComsn1155, "commissionCollection", {
            contractNFT: ERC1155Address,
            commisssion: collectionCommission
        });

        let collComsn721 = await AdminContract.setCollectionCommission(ERC721Address, collectionCommission, { from: deployer });

        expectEvent(collComsn721, "commissionCollection", {
            contractNFT: ERC721Address,
            commisssion: collectionCommission
        });

        // 1155
        let coll_1155_InfoAfter = await AdminContract.collections(ERC1155Address, { from: deployer });
        let newColl_1155_Commission = coll_1155_InfoAfter.commission;

        assert.equal(newColl_1155_Commission, Number(collectionCommission), "commission for ERC-1155 collection is wrong");

        // 721
        let coll_721_InfoAfter = await AdminContract.collections(ERC721Address, { from: deployer });
        let newColl_721_Commission = coll_721_InfoAfter.commission;

        assert.equal(newColl_721_Commission, Number(collectionCommission), "commission for ERC-721 collection is wrong");
    });

    it("expect revert if collection ERC-1155 commission is more than 100%", async () => {
        let wrongCollCommission = new BN(1001);

        await expectRevert(
            AdminContract.setCollectionCommission(ERC1155Address, wrongCollCommission, { from: deployer }),
            "revert"
        )     
    });

    it("expect revert if collection ERC-721 commission is more than 100%", async () => {
        let wrongCollCommission = new BN(1001);

        await expectRevert(
            AdminContract.setCollectionCommission(ERC721Address, wrongCollCommission, { from: deployer }),
            "revert"
        )
    });
});