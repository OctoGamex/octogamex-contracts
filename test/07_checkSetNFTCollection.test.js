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

contract("check revert transfer for setNFT_Collection with canTransfer param equal false", async accounts => {
    const [deployer, accountOne] = accounts;

    let MarketPlace, Auction, AdminContract;
    let MarketPlaceAddress, AuctionAddress, AdminContractAddress;

    let ERC1155, ERC721, ERC20;
    let ERC1155Address, ERC721Address, ERC20Address;
    
    const NFT1155id = new BN(2);
    const NFT721id = new BN(1); 

    const NFTdata = 0; 

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

        Auction = await AuctionContract.new(MarketPlaceAddress, AdminContractAddress, {from: deployer});
        AuctionAddress = Auction.address;

        let canTransfer = false;
        await MarketPlace.setAuctionContract(AuctionAddress, { from: deployer });
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
    });

    it("revert if setNFT_Collection with wrong address", async () => {
        let canTransfer = false;
        await expectRevert(
            AdminContract.setNFT_Collection(constants.ZERO_ADDRESS, canTransfer, { from: deployer }),
            "revert"
        );
    });

    it("revert if setERC20_Support with wrong address", async () => {
        let isERC20Supported = true;
        await expectRevert(
            AdminContract.setERC20_Support(ERC1155Address, [constants.ZERO_ADDRESS], [isERC20Supported], { from: deployer }),
            "revert"
        );
    });

    it("reset market commission", async () => {
        let marketCommission = new BN(150);

        let receipt = await AdminContract.setMarketCommission(marketCommission, {from: deployer});

        expectEvent(receipt, "commissionMarket", {
            commisssion: marketCommission
        });

        let receivedMarketCommission = await AdminContract.marketCommission({from: deployer});
        assert.equal(Number(receivedMarketCommission), marketCommission, "market comission is wrong");
    });

    it("reset offer commission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        commissionOffer = new BN(5).mul(tokenbits);

        let receipt = await AdminContract.setOfferCommission(commissionOffer, {from: deployer});

        expectEvent(receipt, "commissionOffer", {
            commisssion: commissionOffer
        });

        let receivedOfferCommission = await AdminContract.offerCommission({from: deployer});
        assert.equal(Number(receivedOfferCommission), commissionOffer, "offer comission is wrong");
    });

    it("reset market wallet", async () => {
        await MarketPlace.setWallet(deployer, {from: deployer});

        let receivedMarketWallet = await MarketPlace.marketWallet({from: deployer});
        assert.equal(String(receivedMarketWallet), deployer, "market wallet is wrong");
    });

    it("mint & approve NFT and tokens for users", async () => {
        const NFT1155amount = new BN(10);
        const NFTapproved = true;

        await ERC1155.mint(accountOne, NFT1155id, NFT1155amount, NFTdata, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        await ERC721.mint(accountOne, NFT721id, { from: accountOne });
        await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });
    });

    it("expect revert 'add' func if NFT ERC-721 not supported", async () => {
        let NFT721value = new BN(1);
        let isERC1155 = false;
        let lotType = 0; // lotType.None

        await expectRevert(
            MarketPlace.add(ERC721Address, NFT721id, NFT721value, isERC1155, lotType, NFTdata, { from: accountOne }),
            "revert"
        );

        lotType = 1; // lotType.FixedPrice
        await expectRevert(
            MarketPlace.add(ERC721Address, NFT721id, NFT721value, isERC1155, lotType, NFTdata, { from: accountOne }),
            "revert"
        );

        lotType = 2; // lotType.Auction
        await expectRevert(
            MarketPlace.add(ERC721Address, NFT721id, NFT721value, isERC1155, lotType, NFTdata, { from: accountOne }),
            "revert"
        );

        lotType = 3; // lotType.Exchange
        await expectRevert(
            MarketPlace.add(ERC721Address, NFT721id, NFT721value, isERC1155, lotType, NFTdata, { from: accountOne }),
            "revert"
        );
    });

    it("expect revert 'add' func if NFT ERC-1155 not supported", async () => {
        let NFT1155value = new BN(10);
        let isERC1155 = true;
        let lotType = 0; // lotType.None

        await expectRevert(
            MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne }),
            "revert"
        );

        lotType = 1; // lotType.FixedPrice
        await expectRevert(
            MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne }),
            "revert"
        );

        lotType = 2; // lotType.Auction
        await expectRevert(
            MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne }),
            "revert"
        );

        lotType = 3; // lotType.Exchange
        await expectRevert(
            MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne }),
            "revert"
        );
    });

    it("expect revert 'NFT_Sale' func if NFT ERC-1155 not supported", async () => {       
        let value = new BN(10);
        let isERC1155 = true;
        let date = await web3.eth.getBlock("latest");
        let startDate = (new BN(date.timestamp)).add(new BN(5));

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);

        let openForOffers = false;

        await expectRevert(
            MarketPlace.NFT_Sale(ERC1155Address, NFT1155id, value, 
                isERC1155, startDate, ERC20Address, tokensAmount, openForOffers, NFTdata, { from: accountOne }),
            "revert"
        );
    });
})