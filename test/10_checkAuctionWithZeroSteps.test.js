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

contract("Auction: check bids amount with zero steps", async accounts => {
    const [deployer, accountOne, accountTwo, accountThree, accountFour] = accounts;

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
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(1000).mul(tokenbits);

        const accTwoNFT1155amount = new BN(100);
        const accThreeNFT1155amount = new BN(150);
        const accFourNFT1155amount = new BN(200);
        const NFTapproved = true;

        await ERC1155.mint(accountTwo, accTwoNFT1155id, accTwoNFT1155amount, NFTdata, { from: accountTwo });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountTwo });

        await ERC1155.mint(accountThree, accThreeNFT1155id, accThreeNFT1155amount, NFTdata, { from: accountThree });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountThree });

        await ERC1155.mint(accountFour, accFourNFT1155id, accFourNFT1155amount, NFTdata, { from: accountFour });
        await ERC1155.setApprovalForAll(AuctionAddress, NFTapproved, { from: accountFour });

        for(let i = 0; i < addNFT721Num; i++) {
            NFT721ids.push(new BN(i));
            await ERC721.mint(accountOne, NFT721ids[i], { from: accountOne });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });
            await ERC721.setApprovalForAll(AuctionAddress, NFTapproved, { from: accountOne });
        }
        
        let j = 0;
        for(let i = 50; i < accFourNFT721Num; i++) {
            accFourNFT721ids.push(new BN(i));
            await ERC721.mint(accountFour, accFourNFT721ids[j], { from: accountFour });
            await ERC721.setApprovalForAll(AuctionAddress, NFTapproved, { from: accountFour });
            j++;
        }

        await ERC20.mint(accountTwo, tokensAmount, { from: accountTwo });
        await ERC20.approve(AuctionAddress, tokensAmount, { from: accountTwo });

        await ERC20.mint(accountThree, tokensAmount, { from: accountThree });
        await ERC20.approve(AuctionAddress, tokensAmount, { from: accountThree });     
    });

    it("users should be able to add NFT ERC-721", async () => {
        let accOneBalanceBeforeTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });
        let NFT721value = new BN(1);
        let isERC1155 = false;
        let lotType = 2; // lotType.Auction

        for(let i = 0; i < addNFT721Num; i++) {
            await MarketPlace.add(ERC721Address, NFT721ids[i], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });
        }

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotInfo = await MarketPlace.getLots([userLotsIds[0]], { from: accountOne });  
        assert.equal(accountOne, lotInfo.creationInfo.owner, "lot information is wrong");

        let accOneBalanceAfterTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });

        assert.notEqual(accOneBalanceBeforeTransfer, accOneBalanceAfterTransfer, "before add NFT-721 to Market Place and after should not be equal");
        assert.equal(Number(accOneBalanceAfterTransfer), (Number(NFT721value) * addNFT721Num), "after add NFT-721 to Market Place amount is wrong");
    });

    it("users should be able to add NFT ERC-1155", async () => {
        let accTwoBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accTwoNFT1155id, { from: accountTwo });
        let accThreeBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accThreeNFT1155id, { from: accountThree });

        let accTwoNFT1155value = new BN(10);
        let accThreeNFT1155value = new BN(15);
        let isERC1155 = true;
        let addNFTNum = 10; // max 10
        let lotType = 2; // lotType.Auction

        for(let i = 0; i < addNFTNum; i++) {
            await MarketPlace.add(ERC1155Address, accTwoNFT1155id, accTwoNFT1155value, isERC1155, lotType, NFTdata, { from: accountTwo });
            await MarketPlace.add(ERC1155Address, accThreeNFT1155id, accThreeNFT1155value, isERC1155, lotType, NFTdata, { from: accountThree });
        }       

        let accTwoBalanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accTwoNFT1155id, { from: accountTwo });
        let accThreeBalanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accThreeNFT1155id, { from: accountThree });

        assert.notEqual(accTwoBalanceBeforeTransfer, accTwoBalanceAfterTransfer, 
            "before add NFT-1155 to Market Place and after should not be equal (accTwo)");
        assert.equal(Number(accTwoBalanceAfterTransfer), (Number(accTwoNFT1155value) * addNFTNum), 
        "after add NFT-1155 to Market Place amount is wrong (accTwo)");

        assert.notEqual(accThreeBalanceBeforeTransfer, accThreeBalanceAfterTransfer, 
            "before add NFT-1155 to Market Place and after should not be equal (accThree)");
        assert.equal(Number(accThreeBalanceAfterTransfer), (Number(accThreeNFT1155value) * addNFTNum),
        "after add NFT-1155 to Market Place amount is wrong (accThree)");
    });

    it("start auction NFT-721 with zero steps for tokens", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[0];

        let contractDate = await Auction.time();
        let oneDay = 1 * 24 * 3600;
        let tenSecond = new BN(10);

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(10); 
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(100).mul(tokenbits);

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, { from: accountOne });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "first lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "first lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");
    });

    it("start auction NFT-721 with zero steps for cryptocurrancy", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }
        
        let lotId = accOneLotsIds[2];

        let contractDate = await Auction.time();
        let twoDays = 2 * 24 * 3600;
        let tenSecond = new BN(10);

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(twoDays)); // in two days after start auction
        let step = new BN(10);
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(2).mul(tokenbits);

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, { from: accountOne });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "first lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "first lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, cryptoAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "token address is wrong");
    });

    it("start auction NFT-1155 with zero steps for tokens", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[0];

        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(10);
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(25).mul(tokenbits);

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, { from: accountTwo });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "NFT-1155 lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "NFT-1155 lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");
    });

    it("start auction NFT-1155 with zero steps for crypto", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[1];

        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let twoDays = 2 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(twoDays)); // in two days after start auction
        let step = new BN(10);
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(2).mul(tokenbits);

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, { from: accountTwo });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "first lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "first lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, cryptoAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "token address is wrong");
    });

    it("make bids for tokens with NFT-721", async () => {
        await time.increase(time.duration.minutes(1));

        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[0];

        let firstBidAmount = (new BN(100)).mul(tokenbits);

        await Auction.makeBid(lotId, firstBidAmount, { from: accountTwo });

        let secondBibAmount = firstBidAmount;

        await expectRevert(
            Auction.makeBid(lotId, secondBibAmount, { from: accountThree }),
            "revert"
        )
    });

    it("make bids for crypto with NFT-721", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[2];

        let firstBidAmount = (new BN(2)).mul(tokenbits);
        let tokensAmount = new BN(0);

        await Auction.makeBid(lotId, tokensAmount, { from: accountThree, value: firstBidAmount });

        let secondBibAmount = firstBidAmount;

        await expectRevert(
            Auction.makeBid(lotId, tokensAmount, { from: accountFour, value: secondBibAmount }),
            "revert"
        );
    });

    it("make bids for tokens with NFT-1155", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[0];

        let firstBidAmount = (new BN(25)).mul(tokenbits);

        await Auction.makeBid(lotId, firstBidAmount, { from: accountThree });

        let secondBibAmount = firstBidAmount;
      
        await expectRevert(
            Auction.makeBid(lotId, secondBibAmount, { from: accountTwo }),
            "revert"
        );       
    });

    it("make bids for crypto with NFT-1155", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[1];

        let firstBidAmount = (new BN(2)).mul(tokenbits);
        let tokensAmount = new BN(0);

        await Auction.makeBid(lotId, tokensAmount, { from: accountOne, value: firstBidAmount });

        let secondBibAmount = firstBidAmount;  

        await expectRevert(
            Auction.makeBid(lotId, tokensAmount, { from: accountTwo, value: secondBibAmount }),
            "revert"
        );    
    });
})