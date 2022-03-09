const NFT1155 = artifacts.require("TestERC1155");
const NFT721 = artifacts.require("TestERC721");
const Tokens = artifacts.require("TestERC20");
const Marketplace = artifacts.require("NFTMarketplace");

const {
    BN,
    expectEvent,  
    expectRevert, 
    time,
    constants
} = require('@openzeppelin/test-helpers');

contract("sell NFT with offers functionality", async accounts => {
    const [deployer, accountOne, accountTwo, accountThree, accountFour] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace;
    let ERC1155Address, ERC721Address, ERC20Address, MarketPlaceAddress;
    let commissionOffer;
    
    const accOneNFT1155id = new BN(1);
    const accThreeNFT1155id = new BN(2);
    
    let addNFT721Num = 10;
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

        let canTransfer = true;
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
        commissionOffer = new BN(5).mul(tokenbits);

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

        const accOneNFT1155amount = new BN(100);
        const accThreeNFT1155amount = new BN(150);
        const NFTapproved = true;

        await ERC1155.mint(accountOne, accOneNFT1155id, accOneNFT1155amount, NFTdata, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        await ERC1155.mint(accountThree, accThreeNFT1155id, accThreeNFT1155amount, NFTdata, { from: accountThree });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountThree });

        for(let i = 0; i < addNFT721Num; i++) {
            NFT721ids.push(new BN(i));
            await ERC721.mint(accountTwo, NFT721ids[i], { from: accountTwo });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountTwo });
        }

        await ERC20.mint(accountOne, tokensAmount, { from: accountOne });
        await ERC20.approve(MarketPlaceAddress, tokensAmount, { from: accountOne });

        await ERC20.mint(accountThree, tokensAmount, { from: accountThree });
        await ERC20.approve(MarketPlaceAddress, tokensAmount, { from: accountThree });

        await ERC20.mint(accountFour, tokensAmount, { from: accountFour });
        await ERC20.approve(MarketPlaceAddress, tokensAmount, { from: accountFour });
    });

    it("users should be able to add NFT ERC-1155", async () => {
        let accOneBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accOneNFT1155id, { from: accountOne });
        let accThreeBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accThreeNFT1155id, { from: accountThree });

        let accOneNFT1155value = new BN(10);
        let accThreeNFT1155value = new BN(15);
        let isERC1155 = true;
        let addNFTNum = 10; // max 10
        let lotType = 0; // lotType.None

        for(let i = 0; i < addNFTNum; i++) {
            await MarketPlace.add(ERC1155Address, accOneNFT1155id, accOneNFT1155value, isERC1155, lotType, NFTdata, { from: accountOne });
            await MarketPlace.add(ERC1155Address, accThreeNFT1155id, accThreeNFT1155value, isERC1155, lotType, NFTdata, { from: accountThree });
        }        

        let accOneBalanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accOneNFT1155id, { from: accountOne });
        let accThreeBalanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accThreeNFT1155id, { from: accountThree });

        assert.notEqual(accOneBalanceBeforeTransfer, accOneBalanceAfterTransfer, 
            "before add NFT-1155 to Market Place and after should not be equal (accOne)");
        assert.equal(Number(accOneBalanceAfterTransfer), (Number(accOneNFT1155value) * addNFTNum), 
        "after add NFT-1155 to Market Place amount is wrong (accOne)");

        assert.notEqual(accThreeBalanceBeforeTransfer, accThreeBalanceAfterTransfer, 
            "before add NFT-1155 to Market Place and after should not be equal (accThree)");
        assert.equal(Number(accThreeBalanceAfterTransfer), (Number(accThreeNFT1155value) * addNFTNum),
        "after add NFT-1155 to Market Place amount is wrong (accThree)");
    });

    it("users should be able to add NFT ERC-721", async () => {
        let accTwoBalanceBeforeTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountTwo });
        let NFT721value = new BN(1);
        let isERC1155 = false;
        let lotType = 1; // lotType.FixedPrice

        for(let i = 0; i < addNFT721Num; i++) {
            await MarketPlace.add(ERC721Address, NFT721ids[i], NFT721value, isERC1155, lotType, NFTdata, { from: accountTwo });
        }

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotInfo = await MarketPlace.getLots([userLotsIds[0]], { from: accountTwo });  
        assert.equal(accountTwo, lotInfo.creationInfo.owner, "lot information is wrong");

        let accTwoBalanceAfterTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountTwo });

        assert.notEqual(accTwoBalanceBeforeTransfer, accTwoBalanceAfterTransfer, "before add NFT-721 to Market Place and after should not be equal");
        assert.equal(Number(accTwoBalanceAfterTransfer), (Number(NFT721value) * addNFT721Num), "after add NFT-721 to Market Place amount is wrong");
    });

    it("sell NFT-721 with proposal for crypto", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));
        
        let openForOffers = true;

        await MarketPlace.sell(userLotsIds[0], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountTwo });

        let lotInfo = await MarketPlace.lots(userLotsIds[0], { from: accountTwo });
        
        assert.equal(lotInfo.sellStart, String(lotStartDate), "start date of lot is wrong");
        assert.equal(lotInfo.price.buyerPrice, lotPrice, "lot price is wrong");
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "address of price contract is wrong");
        assert.equal(lotInfo.openForOffers, openForOffers, "open for offers is wrong");    
    });

    it("sell NFT-721 with proposal for tokens", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(50)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));
        
        let openForOffers = true;

        await MarketPlace.sell(userLotsIds[1], ERC20Address, lotPrice, openForOffers, lotStartDate, { from: accountTwo });

        let lotInfo = await MarketPlace.lots(userLotsIds[1], { from: accountTwo });
        
        assert.equal(lotInfo.sellStart, String(lotStartDate), "start date of lot is wrong");
        assert.equal(lotInfo.price.buyerPrice, lotPrice, "lot price is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "address of price contract is wrong");
        assert.equal(lotInfo.openForOffers, openForOffers, "open for offers is wrong");       
    });

    it("sell NFT-721 with proposal for tokens (for calcel)", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(10)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));
        
        let openForOffers = true;

        await MarketPlace.sell(userLotsIds[2], ERC20Address, lotPrice, openForOffers, lotStartDate, { from: accountTwo });

        let lotInfo = await MarketPlace.lots(userLotsIds[2], { from: accountTwo });
        
        assert.equal(lotInfo.sellStart, String(lotStartDate), "start date of lot is wrong");
        assert.equal(lotInfo.price.buyerPrice, lotPrice, "lot price is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "address of price contract is wrong");
        assert.equal(lotInfo.openForOffers, openForOffers, "open for offers is wrong");       
    });

    it("sell NFT-1155 with proposal for crypto", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(2)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));
        
        let openForOffers = true;

        await MarketPlace.sell(userLotsIds[0], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[0], { from: accountOne });
        
        assert.equal(lotInfo.sellStart, String(lotStartDate), "start date of lot is wrong");
        assert.equal(lotInfo.price.buyerPrice, lotPrice, "lot price is wrong");
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "address of price contract is wrong");
        assert.equal(lotInfo.openForOffers, openForOffers, "open for offers is wrong");    
    });

    it("sell NFT-1155 with proposal for tokens", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(150)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));
        
        let openForOffers = true;

        await MarketPlace.sell(userLotsIds[1], ERC20Address, lotPrice, openForOffers, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[1], { from: accountOne });
        
        assert.equal(lotInfo.sellStart, String(lotStartDate), "start date of lot is wrong");
        assert.equal(lotInfo.price.buyerPrice, lotPrice, "lot price is wrong");
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "address of price contract is wrong");
        assert.equal(lotInfo.openForOffers, openForOffers, "open for offers is wrong");       
    });

    it("make offer with NFT", async () => {
        let accTwoLotsIds = [], accThreeLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(0, 3); // [0, 1, 2]
        let tokensAmount = new BN(0);

        let lotId = accTwoLotsIds[0];

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: commissionOffer });

        let offersAmount = new BN(1);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("make offer with cryptocurrancy", async () => {
        let accTwoLotsIds = [];
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[1];

        let accThreeExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(5).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: cryptoProposalAmount });

        let offersAmount = new BN(1);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");    
    });

    it("make offer with NFT + tokens", async () => {
        let accOneLotsIds = [], accThreeLotsIds = [];

        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let lotId = accOneLotsIds[0];

        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(3, 4); // [3]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, ERC20Address, 
                tokensAmount, { from: accountThree, value: commissionOffer });

        let offersAmount = new BN(1);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountOne });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("make offer with NFT + cryptocurrancy", async () => {
        let accOneLotsIds = [], accThreeLotsIds = [];

        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let lotId = accOneLotsIds[1];

        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(4, 6); // [4, 5]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(6).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        let offersAmount = new BN(1);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountOne });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("expect revert if token address not supported", async () => {
        let accTwoLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[2];

        let accFourExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(2).mul(tokenbits);

        await expectRevert(
            MarketPlace.makeOffer(lotId, accFourExchangeNFTindexes, accountOne, 
                tokensAmount, { from: accountFour }),
                "revert"
        );
    });

    it("expect revert if tokens amount equal zero", async () => {
        let accTwoLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[2];

        let accFourExchangeNFTindexes = [];
        // const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);

        await expectRevert(
            MarketPlace.makeOffer(lotId, accFourExchangeNFTindexes, ERC20Address, 
                tokensAmount, { from: accountFour }),
                "revert"
        );
    });

    it("make offer with tokens (for cancel)", async () => {
        let accTwoLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[2];

        let accFourExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(2).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accFourExchangeNFTindexes, ERC20Address, 
                tokensAmount, { from: accountFour });

        let offersAmount = new BN(1);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountFour });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("make offer with crypto (for cancel)", async () => {
        let accTwoLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[2];

        let accFourExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(3).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accFourExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountFour, value: cryptoProposalAmount });

        let offersAmount = new BN(2);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("make offer with NFT (for cancel)", async () => {
        let accTwoLotsIds = [], accThreeLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(6, 8); // [6, 7]
        let tokensAmount = new BN(0);

        let lotId = accTwoLotsIds[2];

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: commissionOffer });

        let offersAmount = new BN(3);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("cancel offer with tokens", async () => {
        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });
        let lotOffers = [];
        
        for(let i = 0; i < getInfoAccFour.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccFour.userOffers[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(2).mul(tokenbits);

        let accFourTokensBalanceBefore = await ERC20.balanceOf(accountFour, { from: accountFour });  

        await MarketPlace.cancelOffer(lotOffers[0], { from: accountFour });
        let accFourTokensBalanceAfter = await ERC20.balanceOf(accountFour, { from: accountFour });
 
        assert.equal((Number(accFourTokensBalanceBefore) + Number(tokensAmount)), accFourTokensBalanceAfter, "balance of tokens after canceled is wrong");
    });

    it("cancel offer with NFT", async () => {
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });
        let lotOffers = [];
        
        for(let i = 0; i < getInfoAccThree.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccThree.userOffers[i]));
        }

        let offeredNFTAmount = new BN(30); // from "make offer with NFT (for cancel)" [6, 7]

        let accThreeNFTBalanceBefore = await ERC1155.balanceOf(accountThree, accThreeNFT1155id, { from: accountThree });

        await MarketPlace.cancelOffer(lotOffers[lotOffers.length - 1], { from: accountThree });
        let accThreeNFTBalanceAfter = await ERC1155.balanceOf(accountThree, accThreeNFT1155id, { from: accountThree });

        assert.equal(String(accThreeNFTBalanceBefore.add(offeredNFTAmount)), accThreeNFTBalanceAfter, "offer with NFT is not canceled");
    });

    it("cancel offer with cryptocurrancy", async () => {
        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });
        let lotOffers = [];

        for(let i = 0; i < getInfoAccFour.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccFour.userOffers[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));

        let cryptoProposalAmount = new BN(3); // from "make offer with crypto (for cancel)"
        
        let accFourCryptoBalanceBefore = (await web3.eth.getBalance(accountFour) / tokenbits).toFixed(0);

        await MarketPlace.cancelOffer(lotOffers[lotOffers.length - 1], { from: accountFour });

        let accFourCryptoBalanceAfter = (await web3.eth.getBalance(accountFour) / tokenbits).toFixed(0);

        assert.equal((Number(accFourCryptoBalanceBefore) + Number(cryptoProposalAmount)), accFourCryptoBalanceAfter, 
            "balance of crypto after canceled is wrong");
    });

    it("choose offer with NFT", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let offeredNFTAmount = new BN(45); // from "make offer with NFT" [0, 1, 2]
        let soldNFTAmount = new BN(1);
        let lotId = accTwoLotsIds[0];

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });
   
        await MarketPlace.chooseOffer(lotId, lotOffers[0], NFTdata, { from: accountTwo });

        let accThreeNFTBalance = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accTwoNFTBalance = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo });
        assert.equal(Number(accThreeNFTBalance), soldNFTAmount, "accountTree NFT balance is wrong");
        assert.equal(Number(accTwoNFTBalance), offeredNFTAmount, "accountTwo NFT balance is wrong");
    });

    it("choose offer with cryptocurrancy", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[1];
        let soldNFTAmount = new BN(1);

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        let cryptoProposalAmount = new BN(5).mul(tokenbits);
        let receivedCommission = await MarketPlace.marketCommission({ from: accountTwo });
        
        let accTwoCryptoBalanceBefore = (await web3.eth.getBalance(accountTwo));
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[0], NFTdata, { from: accountTwo });

        const gasUsed = receipt.receipt.gasUsed;

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        let accTwoCryptoBalanceAfter = (await web3.eth.getBalance(accountTwo));
        let accThreeNFTBalanceAfter = await ERC721.balanceOf(accountThree, { from: accountThree });

        let rewardWithCommission = cryptoProposalAmount.sub((cryptoProposalAmount.mul(receivedCommission)).div(new BN(1000)));
        let expectedaccTwoBalance = (rewardWithCommission.add(new BN(accTwoCryptoBalanceBefore))).sub(gasFee);
        
        assert.equal(accTwoCryptoBalanceAfter, expectedaccTwoBalance, "accountTwo balance is wrong after choosed offer");
        assert.equal(String(accThreeNFTBalanceAfter.sub(accThreeNFTBalanceBefore)), soldNFTAmount, 
            "accountTree NFT balance is wrong");
    });

    it("choose offer with NFT + tokens", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[0];
        let offeredNFTAmount = new BN(15); // from "make offer with NFT + tokens" [3]
        let soldNFTAmount = new BN(10); 
        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountOne });
        let accOneNFTBalanceBefore = await ERC1155.balanceOf(accountOne, accThreeNFT1155id, { from: accountOne });   
        let accOneTokensBalanceBefore = await ERC20.balanceOf(accountOne, { from: accountOne });
        let accThreeNFTBalanceBefore = await ERC1155.balanceOf(accountThree, accOneNFT1155id, { from: accountThree });
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);
        let receivedMarketCommission = await MarketPlace.marketCommission({ from: accountOne });

        let expectedTokensProfit = tokensAmount - ((tokensAmount.mul(receivedMarketCommission)).div(new BN(1000)));

        await MarketPlace.chooseOffer(lotId, lotOffers[0], NFTdata, { from: accountOne });
       
        let accOneNFTBalanceAfter = await ERC1155.balanceOf(accountOne, accThreeNFT1155id, { from: accountOne }); 
        let accOneTokensBalanceAfter = await ERC20.balanceOf(accountOne, { from: accountOne });
        let accThreeNFTBalanceAfter = await ERC1155.balanceOf(accountThree,  accOneNFT1155id, { from: accountThree });

        assert.equal((Number(accThreeNFTBalanceAfter) - Number(accThreeNFTBalanceBefore)), soldNFTAmount, 
            "accountTree NFT balance is wrong");
        assert.equal((Number(accOneTokensBalanceAfter) - Number(accOneTokensBalanceBefore)), expectedTokensProfit, 
            "accountOne tokens balance is wrong");
        assert.equal((Number(accOneNFTBalanceAfter) - Number(accOneNFTBalanceBefore)), offeredNFTAmount,
            "accountOne NFT balance is wrong");
    });

    it("choose offer with NFT + cryptocurrancy", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        let accOneLotsIds = [];      

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        let lotId = accOneLotsIds[1];
        let offeredNFTAmount = new BN(30); // from "make offer with NFT + cryptocurrancy" [4, 5]
        let proposalNFTAmount = new BN(10);
        
        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountOne });

        let cryptoProposalAmount = new BN(6).mul(tokenbits);
        let receivedCommission = await MarketPlace.marketCommission({ from: accountOne });

        let accOneCryptoBalanceBefore = (await web3.eth.getBalance(accountOne));
        let accOneNFTBalanceBefore = await ERC1155.balanceOf(accountOne, accThreeNFT1155id, { from: accountOne }); 
        let accThreeNFTBalanceBefore = await ERC1155.balanceOf(accountThree, accOneNFT1155id, { from: accountThree });

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[0], NFTdata, { from: accountOne });

        const gasUsed = receipt.receipt.gasUsed;

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        let accOneCryptoBalanceAfter = (await web3.eth.getBalance(accountOne));
        let accOneNFTBalanceAfter = await ERC1155.balanceOf(accountOne, accThreeNFT1155id, { from: accountOne });
        let accThreeNFTBalanceAfter = await ERC1155.balanceOf(accountThree, accOneNFT1155id, { from: accountThree });

        let rewardWithCommission = cryptoProposalAmount.sub((cryptoProposalAmount.mul(receivedCommission)).div(new BN(1000)));
        let expectedAccOneBalance = (rewardWithCommission.add(new BN(accOneCryptoBalanceBefore))).sub(gasFee);
        
        assert.equal(accOneCryptoBalanceAfter, expectedAccOneBalance, "accountOne balance is wrong after choosed offer");
        assert.equal(String(accOneNFTBalanceAfter.sub(accOneNFTBalanceBefore)), offeredNFTAmount,
            "accountOne NFT balance is wrong");
        assert.equal(String(accThreeNFTBalanceAfter.sub(accThreeNFTBalanceBefore)), proposalNFTAmount, 
            "accountTree NFT balance is wrong");
    });
});