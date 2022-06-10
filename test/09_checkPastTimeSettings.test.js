const NFT1155 = artifacts.require("TestERC1155");
const NFT721 = artifacts.require("TestERC721");
const Tokens = artifacts.require("TestERC20");
const Marketplace = artifacts.require("NFTMarketplace");
const AuctionContract = artifacts.require("Auction");

const {
    BN,
    constants
} = require('@openzeppelin/test-helpers');

contract("check if time is less than block time", async accounts => {
    const [deployer, accountOne, accountTwo] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace, Auction;
    let ERC1155Address, ERC721Address, ERC20Address, MarketPlaceAddress, AuctionAddress;

    let commissionOffer;

    const NFT1155id = new BN(1);
    let addNFT721Num = 3;
    let NFT721ids = []; 
    const NFTdata = 0; 

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

        let canTransfer = true;
        await MarketPlace.setAuctionContract(AuctionAddress, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });

        let isERC20Supported = true;
        await MarketPlace.setERC20_Support(ERC1155Address, [ERC20Address], [isERC20Supported], { from: deployer });
        await MarketPlace.setERC20_Support(ERC721Address, [ERC20Address], [isERC20Supported], { from: deployer });
    });

    it("reset market commission", async () => {
        let marketCommission = new BN(150);

        await MarketPlace.setMarketCommission(marketCommission, {from: deployer});

        let receivedMarketCommission = await MarketPlace.marketCommission({from: deployer});
        assert.equal(Number(receivedMarketCommission), marketCommission, "market comission is wrong");
    });

    it("reset offer commission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        commissionOffer = new BN(1).mul(tokenbits);

        await MarketPlace.setOfferCommission(commissionOffer, {from: deployer});

        let receivedOfferCommission = await MarketPlace.offerCommission({from: deployer});
        assert.equal(Number(receivedOfferCommission), commissionOffer, "offer comission is wrong");
    });

    it("reset market wallet", async () => {
        await MarketPlace.setWallet(deployer, {from: deployer});

        let receivedMarketWallet = await MarketPlace.marketWallet({from: deployer});
        assert.equal(String(receivedMarketWallet), deployer, "market wallet is wrong");
    });

    it("mint & approve NFT and tokens for users", async () => {
        const NFT1155amount = new BN(30);
        const NFTapproved = true;

        await ERC1155.mint(accountTwo, NFT1155id, NFT1155amount, NFTdata, { from: accountTwo });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountTwo });

        for(let i = 0; i < addNFT721Num; i++) {
            NFT721ids.push(new BN(i));
            await ERC721.mint(accountOne, NFT721ids[i], { from: accountOne });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });
            await ERC721.setApprovalForAll(AuctionAddress, NFTapproved, { from: accountOne });
        }            
    });

    it("users should be able to add NFT ERC-721", async () => {
        let accOneBalanceBeforeTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });
        let NFT721value = new BN(1);
        let isERC1155 = false;

        let lotType = 1; // lotType.FixedPrice
        await MarketPlace.add(ERC721Address, NFT721ids[0], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });

        lotType = 2; // lotType.Auction
        await MarketPlace.add(ERC721Address, NFT721ids[1], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });

        lotType = 3; // lotType.Exchange
        await MarketPlace.add(ERC721Address, NFT721ids[2], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }
        
        let lotInfo = await MarketPlace.lots([userLotsIds[0]], { from: accountOne });  
        assert.equal(accountOne, lotInfo.creationInfo.owner, "lot information is wrong");

        let accOneBalanceAfterTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });

        assert.notEqual(accOneBalanceBeforeTransfer, accOneBalanceAfterTransfer, "before add NFT-721 to Market Place and after should not be equal");
        assert.equal(String(accOneBalanceAfterTransfer), NFT721value.mul(new BN(userLotsIds.length)), "after add NFT-721 to Market Place amount is wrong");
    });

    it("users should be able to add NFT ERC-1155", async () => {
        let balanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, NFT1155id, { from: accountTwo });

        let NFT1155value = new BN(10);
        let isERC1155 = true;

        let lotType = 1; // lotType.FixedPrice
        await MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountTwo });

        lotType = 2; // lotType.Auction
        await MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountTwo });

        lotType = 3; // lotType.Exchange
        await MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountTwo });

        let balanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, NFT1155id, { from: accountTwo });

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        assert.notEqual(balanceBeforeTransfer, balanceAfterTransfer, 
            "before add NFT-1155 to Market Place and after should not be equal");
        assert.equal(String(balanceAfterTransfer), NFT1155value.mul(new BN(userLotsIds.length)), 
            "after add NFT-1155 to Market Place amount is wrong");
    });

    it("sell NFT-721 with less time than time now", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).sub(new BN(60));

        let openForOffers = false;
        let lotId = userLotsIds[0];

        await MarketPlace.sell(lotId, constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne });
        date = await web3.eth.getBlock("latest");

        let lotInfo = await MarketPlace.lots(lotId, { from: accountOne });

        assert.equal(new BN(date.timestamp), String(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, lotInfo.price.buyerPrice, "lot price is wrong");
    });

    it("sell NFT-721 for proposal with less time than time now", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = new BN(0);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).sub(new BN(120));

        let openForOffers = true;
        let lotId = userLotsIds[1];

        await MarketPlace.sell(lotId, constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne });
        date = await web3.eth.getBlock("latest");

        let lotInfo = await MarketPlace.lots(lotId, { from: accountOne });

        assert.equal(new BN(date.timestamp), String(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, lotInfo.price.buyerPrice, "lot price is wrong");   
    });

    it("start auction for NFT-721 with less time than time now", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotId = userLotsIds[2];

        let contractDate = await Auction.time();
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.sub(new BN(oneDay));
        let lotEndDate = contractDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(100).mul(tokenbits);

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, { from: accountOne });
        let latestBlock = await web3.eth.getBlock("latest");

        let lotInfo = await MarketPlace.lots(lotId, { from: accountOne });

        assert.equal(lotInfo.auction.startAuction, latestBlock.timestamp, "first lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "first lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");
    });

    it("sell NFT-1155 with less time than time now", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).sub(new BN(60));

        let openForOffers = false;
        let lotId = userLotsIds[0];

        await MarketPlace.sell(lotId, constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountTwo });
        date = await web3.eth.getBlock("latest");

        let lotInfo = await MarketPlace.lots(lotId, { from: accountTwo });

        assert.equal(new BN(date.timestamp), String(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, lotInfo.price.buyerPrice, "lot price is wrong");
    });

    it("sell NFT-1155 for proposal with less time than time now", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = new BN(0);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).sub(new BN(120));

        let openForOffers = true;
        let lotId = userLotsIds[1];

        await MarketPlace.sell(lotId, constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountTwo });
        date = await web3.eth.getBlock("latest");

        let lotInfo = await MarketPlace.lots(lotId, { from: accountTwo });

        assert.equal(new BN(date.timestamp), String(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, lotInfo.price.buyerPrice, "lot price is wrong");   
    });

    it("start auction for NFT-1155 with less time than time now", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotId = userLotsIds[2];

        let contractDate = await Auction.time();
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.sub(new BN(oneDay));
        let lotEndDate = contractDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(100).mul(tokenbits);

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, { from: accountTwo });
        let latestBlock = await web3.eth.getBlock("latest");
        let lotInfo = await MarketPlace.lots(lotId, { from: accountTwo });

        assert.equal(lotInfo.auction.startAuction, latestBlock.timestamp, "first lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "first lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");
    });
})