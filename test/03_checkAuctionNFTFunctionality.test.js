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

contract("auction NFT functionality", async accounts => {
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

    let winningBetsNFT721 = [];
    let winningBetsNFT1155 = [];

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

    it("start auction with start day now for tokens", async () => {
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
        let step = new BN(150); // 15%
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

    it("start auction after a while for tokens", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[1];

        let contractDate = await Auction.time();
        let oneDay = 1 * 24 * 3600;
        let threeDays = 3 * 24 * 3600;
      
        let lotStartDate = contractDate.add(new BN(oneDay)); // in one day     
        let lotEndDate = lotStartDate.add(new BN(threeDays)); // in three days after auction start 
        let step = new BN(200); // 20%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, { from: accountOne });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "first lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "first lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");
    });

    it("start auction with start day now for cryptocurrancy", async () => {
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
        let step = new BN(50); // 5%
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

    it("expect revert if start day more than a month", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[3];
        
        let contractDate = await Auction.time();
        let thirtytwoDays = 32 * 24 * 3600;
        let twoDays = 2 * 24 * 3600;

        let lotStartDate = contractDate.add(new BN(thirtytwoDays)); 
        let lotEndDate = lotStartDate.add(new BN(twoDays)); // in two days after auction start 
        let step = new BN(35); // 3.5%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(2).mul(tokenbits);

        await  expectRevert(
            Auction.startAuction(lotId, lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, { from: accountOne }),
            "revert"
        );
    });

    it("start auction after a while for cryptocurrancy", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[3];
        
        let contractDate = await Auction.time();
        let fiveDays = 5 * 24 * 3600;
        let twoDays = 2 * 24 * 3600;

        let lotStartDate = contractDate.add(new BN(fiveDays)); // in five days  
        let lotEndDate = lotStartDate.add(new BN(twoDays)); // in two days after auction start 
        let step = new BN(35); // 3.5%
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

    it("percent of step in func 'startAuction' should NOT be bigger than 100%", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[4];
        
        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day
        let step = new BN(1001); // 100.1%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(2).mul(tokenbits);

        await expectRevert( 
            Auction.startAuction(lotId, lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, { from: accountOne }),
            "revert"
        );
    });

    it("end date in func 'startAuction' should not be equal or less than start day", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[5];
        
        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = contractDate.add(tenSecond);
        let step = new BN(100); // 10%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(2).mul(tokenbits);

        await expectRevert( 
            Auction.startAuction(lotId, lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, { from: accountOne }),
            "Not correct start or end date"
        );

        lotEndDate = contractDate.sub(new BN(oneDay));
        
        await expectRevert( 
            Auction.startAuction(lotId, lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, { from: accountOne }),
            "Not correct start or end date"
        );
    });

    it("start date in func 'startAuction' should NOT be less than date now", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[6];
        
        let contractDate = await Auction.time();
        let twoDays = 2 * 24 * 3600;

        let lotStartDate = contractDate.sub(new BN(twoDays)); // 2 days ago
        let lotEndDate = contractDate;
        let step = new BN(100); // 10%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(2).mul(tokenbits);

        await expectRevert( 
            Auction.startAuction(lotId, lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, { from: accountOne }),
            "revert"
        );
    });

    it("'tokenAddress' should be at least ERC-20 or zero address", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[7];
        
        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day
        let step = new BN(100); // 10%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokenAmount = new BN(1).mul(tokenbits);

        await expectRevert(
            Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC1155Address, tokenAmount, { from: accountOne }),
            "revert"
        );
    });

    it("zero price 'amount' if sale of a lot for tokens", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[8];
        
        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokenAmount = new BN(0);

        await expectRevert(
            Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC20Address, tokenAmount, { from: accountOne }),
            "revert"
        );
    });

    it("zero price 'amount' if sale of a lot for cryptocurrancy", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[9];
        
        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(0);

        await expectRevert(
            Auction.startAuction(lotId, lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, { from: accountOne }),
            "revert"
        );
    });

    it("user should be able start auction with NFT-1155 for tokens", async () => {
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
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(25).mul(tokenbits);

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, { from: accountTwo });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "NFT-1155 lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "NFT-1155 lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");
    })

    it("user should be able start auction with NFT-1155 for crypto", async () => {
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
        let step = new BN(50); // 5%
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

    it("should revert if bid less than initial rate", async () => {
        await time.increase(time.duration.seconds(10));
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[0];

        let bidAmount = (new BN(90)).mul(tokenbits);

        await expectRevert( 
            Auction.makeBid(lotId, bidAmount, { from: accountTwo }),
            "Not enought payment"
        );
    });

    it("make bids for tokens with NFT-721", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[0];

        let firstBidAmount = (new BN(100)).mul(tokenbits);

        await Auction.makeBid(lotId, firstBidAmount, { from: accountTwo });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        let bidStepAmount = (firstBidAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let secondBibAmount = firstBidAmount.add(bidStepAmount);
        let accThreeBalanceBefore = await ERC20.balanceOf(accountThree, { from: accountThree });

        await expectRevert( 
            Auction.makeBid(lotId, firstBidAmount, { from: accountThree }),
            "Not enought payment"
        );

        await Auction.makeBid(lotId, secondBibAmount, { from: accountThree });

        lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        assert.equal(lotInfo.auction.lastBid, accountThree, "address of user maked bid is wrong");

        bidStepAmount = (secondBibAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let thirdBidAmount = secondBibAmount.add(bidStepAmount);

        await Auction.makeBid(lotId, thirdBidAmount, { from: accountTwo });

        winningBetsNFT721.push(thirdBidAmount);

        lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        assert.equal(lotInfo.auction.lastBid, accountTwo, "address of user maked bid is wrong");

        let accThreeBalanceAfter = await ERC20.balanceOf(accountThree, { from: accountThree });
        assert.equal(String(accThreeBalanceBefore), String(accThreeBalanceAfter), "accountThree address tokens didn't return");
    });

    it("expect revert with func finishAuction if lot has bid", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[0];

        await expectRevert(
            Auction.finishAuction(lotId, NFTdata, { from: accountOne }),
            "Lot have bid"
        );
    });

    it("expect revert if tokens amount is zero in func makeBid for tokens", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[0];

        let firstBidAmount = new BN(0);

        await expectRevert(
            Auction.makeBid(lotId, firstBidAmount, { from: accountThree }),
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

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });
        let bidStepAmount = (firstBidAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let secondBibAmount = firstBidAmount.add(bidStepAmount);
        let accTwoBalanceBefore = await ERC20.balanceOf(accountTwo, { from: accountTwo });

        await expectRevert( 
            Auction.makeBid(lotId, firstBidAmount, { from: accountTwo }),
            "Not enought payment"
        );

        await Auction.makeBid(lotId, secondBibAmount, { from: accountTwo }); 
        
        lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });
        assert.equal(lotInfo.auction.lastBid, accountTwo, "address of user maked bid is wrong");

        bidStepAmount = (secondBibAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let thirdBidAmount = secondBibAmount.add(bidStepAmount);

        await Auction.makeBid(lotId, thirdBidAmount, { from: accountThree });

        lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });
        assert.equal(lotInfo.auction.lastBid, accountThree, "address of user maked bid is wrong");

        let accTwoBalanceAfter = await ERC20.balanceOf(accountTwo, { from: accountTwo });
        assert.equal(String(accTwoBalanceBefore), String(accTwoBalanceAfter), "two address tokens didn't return");

        let fourthBidAmount = (new BN(1)).mul(tokenbits);

        await expectRevert(
            Auction.makeBid(lotId, fourthBidAmount, { from: accountThree }),
            "revert"
        );
        // winningBetsNFT1155.push(fourthBidAmount.add(thirdBidAmount));
        winningBetsNFT1155.push(thirdBidAmount);
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

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        let bidStepAmount = (firstBidAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let secondBibAmount = firstBidAmount.add(bidStepAmount);

        await expectRevert( 
            Auction.makeBid(lotId, tokensAmount, { from: accountFour, value: firstBidAmount }),
            "Not enought payment"
        );

        let accFourCryptoBalBefore = (await web3.eth.getBalance(accountFour));

        let receipt = await Auction.makeBid(lotId, tokensAmount, { from: accountFour, value: secondBibAmount });

        const gasUsed = receipt.receipt.gasUsed;

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        assert.equal(lotInfo.auction.lastBid, accountFour, "address of user maked bid is wrong");

        bidStepAmount = (secondBibAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let thirdBidAmount = secondBibAmount.add(bidStepAmount);

        await Auction.makeBid(lotId, tokensAmount, { from: accountThree, value: thirdBidAmount });

        lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        assert.equal(lotInfo.auction.lastBid, accountThree, "address of user maked bid is wrong");

        let accFourCryptoBalAfter = (await web3.eth.getBalance(accountFour));
        assert.equal((new BN(accFourCryptoBalAfter)).add(gasFee), accFourCryptoBalBefore, "four address crypto didn't return");

        let fourthBidAmount = new BN(10000);    

        await expectRevert(
            Auction.makeBid(lotId, tokensAmount, { from: accountThree, value: fourthBidAmount }),
            "revert"
        )

        // if the same user makes a bet, the previous bet is not returned to this user, the bets are added
        // winningBetsNFT721.push(fourthBidAmount.add(thirdBidAmount));
        winningBetsNFT721.push(thirdBidAmount);
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

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });
        let bidStepAmount = (firstBidAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let secondBibAmount = firstBidAmount.add(bidStepAmount);

        await expectRevert( 
            Auction.makeBid(lotId, tokensAmount, { from: accountTwo, value: firstBidAmount }),
            "Not enought payment"
        );

        let accTwoCryptoBalBefore = (await web3.eth.getBalance(accountTwo));

        let receipt = await Auction.makeBid(lotId, tokensAmount, { from: accountTwo, value: secondBibAmount });

        const gasUsed = receipt.receipt.gasUsed;

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });
        assert.equal(lotInfo.auction.lastBid, accountTwo, "address of user maked bid is wrong");

        bidStepAmount = (secondBibAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let thirdBidAmount = secondBibAmount.add(bidStepAmount);

        await Auction.makeBid(lotId, tokensAmount, { from: accountOne, value: thirdBidAmount });
        
        winningBetsNFT1155.push(thirdBidAmount);

        lotInfo = await MarketPlace.getLots(lotId, { from: accountTwo });
        assert.equal(lotInfo.auction.lastBid, accountOne, "address of user maked bid is wrong");

        let accTwoCryptoBalAfter = (await web3.eth.getBalance(accountTwo));
        assert.equal((new BN(accTwoCryptoBalAfter)).add(gasFee), accTwoCryptoBalBefore, "accountTwo address crypto didn't return");
    });

    it("users should not have possibility make bids if auction no started yet", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[1];

        let bidAmount = (new BN(50)).mul(tokenbits);

        await expectRevert( 
            Auction.makeBid(lotId, bidAmount, { from: accountTwo }),
            "Lot not on auction"
        );
        
        lotId = accOneLotsIds[3];

        bidAmount = (new BN(2)).mul(tokenbits);
        let tokensAmount = new BN(0);

        await expectRevert( 
            Auction.makeBid(lotId, tokensAmount, { from: accountTwo, value: bidAmount }),
            "Lot not on auction"
        );
    });

    it("user cannot end auction until auction time is out", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountThree });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[0];

        await expectRevert(
            Auction.endAuction(lotId, NFTdata, { from: accountThree }),
            "Auction not ended"
        );
    });

    it("make bids for tokens auction started after a while", async () => {
        await time.increase(time.duration.days(1));

        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[1];

        let firstBidAmount = (new BN(50)).mul(tokenbits);

        await Auction.makeBid(lotId, firstBidAmount, { from: accountTwo });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        let bidStepAmount = (firstBidAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let secondBibAmount = firstBidAmount.add(bidStepAmount);
        let accThreeBalanceBefore = await ERC20.balanceOf(accountThree, { from: accountThree });

        await expectRevert( 
            Auction.makeBid(lotId, firstBidAmount, { from: accountThree }),
            "Not enought payment"
        );

        await Auction.makeBid(lotId, secondBibAmount, { from: accountThree });

        lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        assert.equal(lotInfo.auction.lastBid, accountThree, "address of user maked bid is wrong");

        bidStepAmount = (secondBibAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let thirdBidAmount = secondBibAmount.add(bidStepAmount);

        await Auction.makeBid(lotId, thirdBidAmount, { from: accountTwo });

        lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        assert.equal(lotInfo.auction.lastBid, accountTwo, "address of user maked bid is wrong");

        let accThreeBalanceAfter = await ERC20.balanceOf(accountThree, { from: accountThree });
        assert.equal(String(accThreeBalanceBefore), String(accThreeBalanceAfter), "third address tokens didn't return");
    });

    it("end auction for tokens with NFT-721", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[0];

        let accTwoNFTBalanceBefore = await ERC721.balanceOf(accountTwo, { from: accountTwo });
        let accOneTokensBalanceBefore = await ERC20.balanceOf(accountOne, { from: accountOne });

        await Auction.endAuction(lotId, NFTdata, { from: accountOne });

        let winningBet = winningBetsNFT721[0];
        let accTwoNFTBalanceAfter = await ERC721.balanceOf(accountTwo, { from: accountTwo });
        let accOneTokensBalanceAfter = await ERC20.balanceOf(accountOne, { from: accountOne });
        
        let commission = await MarketPlace.marketCommission({ from: deployer });
        
        let expectedNFT = accTwoNFTBalanceBefore.add(new BN(1));
        let expectedTokensReward = accOneTokensBalanceBefore.add(winningBet.sub((winningBet.mul(commission)).div(new BN(1000))));

        assert.equal(String(accTwoNFTBalanceAfter), expectedNFT, "NFT balance of user is wrong");
        assert.equal(String(accOneTokensBalanceAfter), expectedTokensReward, "token balance of user is wrong");
    });

    it("end auction for tokens with NFT-1155", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[0];
          
        let accThreeNFTBalanceBefore = await ERC1155.balanceOf(accountThree, accTwoNFT1155id, { from: accountThree });
        let accTwoTokensBalanceBefore = await ERC20.balanceOf(accountTwo, { from: accountTwo });

        await Auction.endAuction(lotId, NFTdata, { from: accountThree });
        
        let winningBet = winningBetsNFT1155[0];
        let accThreeNFTBalanceAfter = await ERC1155.balanceOf(accountThree, accTwoNFT1155id, { from: accountThree });
        let accTwoTokensBalanceAfter = await ERC20.balanceOf(accountTwo, { from: accountTwo });

        let commission = await MarketPlace.marketCommission({ from: deployer });
        
        let expectedNFT = accThreeNFTBalanceBefore.add(new BN(10));
        let expectedTokensReward = accTwoTokensBalanceBefore.add(winningBet.sub((winningBet.mul(commission)).div(new BN(1000))));
        
        assert.equal(String(accThreeNFTBalanceAfter), expectedNFT, "NFT balance of user is wrong");
        assert.equal(String(accTwoTokensBalanceAfter), expectedTokensReward, "token balance of user is wrong");
    });

    it("make bids for crypto auction started after a while", async () => {
        await time.increase(time.duration.days(4));

        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[3];

        let firstBidAmount = (new BN(2)).mul(tokenbits);
        let tokensAmount = new BN(0);

        await Auction.makeBid(lotId, tokensAmount, { from: accountThree, value: firstBidAmount });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        let bidStepAmount = (firstBidAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let secondBibAmount = firstBidAmount.add(bidStepAmount);

        let nextStep = await MarketPlace.getNextStep(lotId, { from: accountThree });
        assert.equal(String(nextStep), secondBibAmount, "next step is wrong");

        await expectRevert( 
            Auction.makeBid(lotId, tokensAmount, { from: accountFour, value: firstBidAmount }),
            "Not enought payment"
        );

        let accFourCryptoBalBefore = (await web3.eth.getBalance(accountFour));

        let receipt = await Auction.makeBid(lotId, tokensAmount, { from: accountFour, value: secondBibAmount });

        const gasUsed = receipt.receipt.gasUsed;

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        assert.equal(lotInfo.auction.lastBid, accountFour, "address of user maked bid is wrong");

        bidStepAmount = (secondBibAmount.mul(new BN(lotInfo.auction.step))).div(new BN(1000));
        let thirdBidAmount = secondBibAmount.add(bidStepAmount);

        await Auction.makeBid(lotId, tokensAmount, { from: accountThree, value: thirdBidAmount });

        lotInfo = await MarketPlace.getLots(lotId, { from: accountOne });
        assert.equal(lotInfo.auction.lastBid, accountThree, "address of user maked bid is wrong");

        let accFourCryptoBalAfter = (await web3.eth.getBalance(accountFour));
        assert.equal((new BN(accFourCryptoBalAfter)).add(gasFee), accFourCryptoBalBefore, "four address crypto didn't return");
    });

    it("end auction for crypto with NFT-721", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[2];
        const tokenbits = (new BN(10)).pow(new BN(18));
        
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accOneCryptoBalanceBefore = (await web3.eth.getBalance(accountOne));

        let receipt = await Auction.endAuction(lotId, NFTdata, { from: accountOne });

        const gasUsed = receipt.receipt.gasUsed;

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        let accThreeNFTBalanceAfter = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accOneCryptoBalanceAfter = (await web3.eth.getBalance(accountOne));

        let commission = await MarketPlace.marketCommission({ from: deployer });
        let winningBet = winningBetsNFT721[1];

        let expectedNFT = accThreeNFTBalanceBefore.add(new BN(1));
        let expectedCryptoReward = ((new BN(accOneCryptoBalanceBefore)).add(winningBet.sub((winningBet.mul(commission)).div(new BN(1000))))).sub(gasFee);

        assert.equal(String(accThreeNFTBalanceAfter), expectedNFT, "NFT balance of user is wrong");
        assert.equal(String(accOneCryptoBalanceAfter), expectedCryptoReward, "reward of crypto is wrong");
    });

    it("end auction for crypto with NFT-1155", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[1];
        const tokenbits = (new BN(10)).pow(new BN(18));
        
        let accOneNFTBalanceBefore = await ERC1155.balanceOf(accountOne, accTwoNFT1155id, { from: accountOne });
        let accTwoCryptoBalanceBefore = (await web3.eth.getBalance(accountTwo));

        await Auction.endAuction(lotId, NFTdata, { from: accountOne });

        let accOneNFTBalanceAfter = await ERC1155.balanceOf(accountOne, accTwoNFT1155id, { from: accountOne });
        let accTwoCryptoBalanceAfter = (await web3.eth.getBalance(accountTwo));

        let commission = await MarketPlace.marketCommission({ from: deployer });
        let winningBet = winningBetsNFT1155[1];

        let expectedNFT = accOneNFTBalanceBefore.add(new BN(10));
        let expectedCryptoReward = (new BN(accTwoCryptoBalanceBefore)).add(winningBet.sub((winningBet.mul(commission)).div(new BN(1000))));

        assert.equal(String(accOneNFTBalanceAfter), expectedNFT, "NFT balance of user is wrong");
        assert.equal(String(accTwoCryptoBalanceAfter), expectedCryptoReward, "reward of crypto is wrong");
    });

    it("check for the possibility to pick up lot before start bids", async () => {
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        let accThreeLotsIds = [];      

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let lotId = accThreeLotsIds[0];

        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(50); // 5%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(25).mul(tokenbits);

        let balanceBefore = await ERC1155.balanceOf(accountThree, accThreeNFT1155id, { from: accountThree });

        await Auction.startAuction(lotId, lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, { from: accountThree });

        let lotInfo = await MarketPlace.getLots(lotId, { from: accountThree });

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "NFT-1155 lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "NFT-1155 lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");

        await Auction.finishAuction(lotId, NFTdata, { from: accountThree });

        let expectedNFTreturn = new BN(15);
        let balanceAfter = await ERC1155.balanceOf(accountThree, accThreeNFT1155id, { from: accountThree });       
        lotInfo = await MarketPlace.getLots(lotId, { from: accountThree });

        assert.equal(lotInfo.auction.startAuction, 0, "NFT-1155 lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, 0, "NFT-1155 lot end date is wrong");
        assert.equal(lotInfo.auction.step, 0, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, 0, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "token address is wrong");

        assert.equal(String(balanceAfter), balanceBefore.add(expectedNFTreturn), "NFT is not returned to balance");
    });

    // commission

    it("reset market commission", async () => {
        let marketCommission = new BN(0);

        await MarketPlace.setMarketCommission(marketCommission, {from: deployer});

        let receivedMarketCommission = await MarketPlace.marketCommission({from: deployer});
        assert.equal(Number(receivedMarketCommission), marketCommission, "market comission is wrong");
    });

    it("reset offer commission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        commissionOffer = new BN(0);

        await MarketPlace.setOfferCommission(commissionOffer, {from: deployer});

        let receivedOfferCommission = await MarketPlace.offerCommission({from: deployer});
        assert.equal(Number(receivedOfferCommission), commissionOffer, "offer comission is wrong");
    });

    it("check 'createAuction' functionality with NFT-1155 for tokens", async () => {
        let accFourNFT1155value = new BN(100);
        let isERC1155 = true;

        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(500).mul(tokenbits);
        
        await Auction.createAuction(ERC1155Address, accFourNFT1155id, accFourNFT1155value, isERC1155, 
            lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, NFTdata, { from: accountFour });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.getLots(lotLength - 1, { from: accountFour });  
        
        assert.equal(lotInfo.creationInfo.owner, accountFour, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC1155Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, accFourNFT1155value, "NFT amount is wrong");

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "NFT-1155 lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "NFT-1155 lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");
    });

    it("check 'createAuction' functionality with NFT-1155 for crypto", async () => {
        let accFourNFT1155value = new BN(100);
        let isERC1155 = true;

        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(5).mul(tokenbits);
        
        await Auction.createAuction(ERC1155Address, accFourNFT1155id, accFourNFT1155value, isERC1155, 
            lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, NFTdata, { from: accountFour });


        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.getLots(lotLength - 1, { from: accountFour }); 
        
        assert.equal(lotInfo.creationInfo.owner, accountFour, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC1155Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, accFourNFT1155value, "NFT amount is wrong");

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "NFT-1155 lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "NFT-1155 lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, cryptoAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "token address is wrong");
    });

    it("check 'createAuction' functionality with NFT-721 for tokens", async () => {
        let NFT721value = new BN(1);
        let isERC1155 = false;

        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(20).mul(tokenbits);
        
        await Auction.createAuction(ERC721Address, accFourNFT721ids[0], NFT721value, isERC1155, 
            lotStartDate, lotEndDate, step, ERC20Address, tokensAmount, NFTdata, { from: accountFour });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.getLots(lotLength - 1, { from: accountFour }); 
        
        assert.equal(lotInfo.creationInfo.owner, accountFour, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC721Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, NFT721value, "NFT amount is wrong");

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "NFT-1155 lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "NFT-1155 lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, tokensAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "token address is wrong");

        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });

        let accFourLotsIds = [];      

        for(let i = 0; i < getInfoAccFour.userLots.length; i++) {
            accFourLotsIds.push(Number(getInfoAccFour.userLots[i]));
        }

        let lotId = accFourLotsIds[accFourLotsIds.length - 1];

        await time.increase(time.duration.hours(25));

        await Auction.endAuction(lotId, NFTdata, { from: accountFour });
    });

    it("check 'createAuction' functionality with NFT-721 for crypto", async () => {
        let NFT721value = new BN(1);
        let isERC1155 = false;

        let contractDate = await Auction.time();
        let tenSecond = new BN(10);
        let oneDay = 1 * 24 * 3600;

        let lotStartDate = contractDate.add(tenSecond);
        let lotEndDate = lotStartDate.add(new BN(oneDay)); // in one day after start auction
        let step = new BN(150); // 15%
        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(3).mul(tokenbits);
        
        await Auction.createAuction(ERC721Address, accFourNFT721ids[1], NFT721value, isERC1155, 
            lotStartDate, lotEndDate, step, constants.ZERO_ADDRESS, cryptoAmount, NFTdata, { from: accountFour });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.getLots(lotLength - 1, { from: accountFour }); 
        
        assert.equal(lotInfo.creationInfo.owner, accountFour, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC721Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, NFT721value, "NFT amount is wrong");

        assert.equal(lotInfo.auction.startAuction, lotStartDate, "NFT-1155 lot start date is wrong");
        assert.equal(lotInfo.auction.endAuction, lotEndDate, "NFT-1155 lot end date is wrong");
        assert.equal(lotInfo.auction.step, step, "step of auction bids is wrong");
        assert.equal(lotInfo.auction.nextStep, cryptoAmount, "amount of tokens is wrong");
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "token address is wrong");

        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });

        let accFourLotsIds = [];      

        for(let i = 0; i < getInfoAccFour.userLots.length; i++) {
            accFourLotsIds.push(Number(getInfoAccFour.userLots[i]));
        }

        let lotId = accFourLotsIds[accFourLotsIds.length - 1];

        await Auction.finishAuction(lotId, NFTdata, { from: accountFour });
    });

});