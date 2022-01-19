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

contract("proposal NFT functionality", async accounts => {
    const [deployer, accountOne, accountTwo, accountThree, accountFour] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace;
    let ERC1155Address, ERC721Address, ERC20Address, MarketPlaceAddress;

    let commissionOffer;

    let addNFT721Num = 9;
    let accFourNFT721Num = 12;

    const accOneNFT1155id = new BN(1);
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

    it("mint, approve & set NFT collection", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(1000).mul(tokenbits);

        const accOneNFT1155amount = new BN(100);
        const accThreeNFT1155amount = new BN(150);
        const accFourNFT1155amount = new BN(200);
        const NFTapproved = true;

        await ERC1155.mint(accountOne, accOneNFT1155id, accOneNFT1155amount, NFTdata, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        await ERC1155.mint(accountThree, accThreeNFT1155id, accThreeNFT1155amount, NFTdata, { from: accountThree });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountThree });

        await ERC1155.mint(accountFour, accFourNFT1155id, accFourNFT1155amount, NFTdata, { from: accountFour });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountFour });

        for(let i = 0; i < addNFT721Num; i++) {
            NFT721ids.push(new BN(i));
            await ERC721.mint(accountTwo, NFT721ids[i], { from: accountTwo });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountTwo });
        }

        let j = 0;
        for(let i = 10; i < accFourNFT721Num; i++) {
            accFourNFT721ids.push(new BN(i));
            await ERC721.mint(accountFour, accFourNFT721ids[j], { from: accountFour });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountFour });
            j++;
        }

        await ERC20.mint(accountOne, tokensAmount, { from: accountOne });
        await ERC20.approve(MarketPlaceAddress, tokensAmount, { from: accountOne });

        await ERC20.mint(accountThree, tokensAmount, { from: accountThree });
        await ERC20.approve(MarketPlaceAddress, tokensAmount, { from: accountThree });

        await ERC20.mint(accountFour, tokensAmount, { from: accountFour });
        await ERC20.approve(MarketPlaceAddress, tokensAmount, { from: accountFour });

        let canTransfer = true;

        await MarketPlace.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });
    });

    it("users should be able to add NFT ERC-1155", async () => {
        let accOneBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accOneNFT1155id, { from: accountOne });
        let accThreeBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accThreeNFT1155id, { from: accountThree });

        let accOneNFT1155value = new BN(10);
        let accThreeNFT1155value = new BN(15);
        let isERC1155 = true;
        let addNFTNum = 10; // max 10
        let lotType = 3; // lotType.Exchange

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
        let lotType = 3; // lotType.Exchange

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

    it("set ERC-20 support", async () => {
        let isERC20Supported = true;
        await MarketPlace.setERC20_Support(ERC1155Address, [ERC20Address], [isERC20Supported], { from: deployer });
        await MarketPlace.setERC20_Support(ERC721Address, [ERC20Address], [isERC20Supported], { from: deployer });
    });

    it("sell NFT with zero price for proposal", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(0));
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));

        let lotInfo;
        let openForOffers = true;

        for(let i = 0; i < addNFT721Num; i++) {
            await MarketPlace.sell(userLotsIds[i], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountTwo });

            lotInfo = await MarketPlace.lots(userLotsIds[i], { from: accountTwo });
     
            assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
            assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
        }     
    });

    it("make offer with NFT", async () => {
        let accOneLotsIds = [], accTwoLotsIds = [], accThreeLotsIds = [];

        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let accOneExchangeNFTindexes = accOneLotsIds.slice(0, 2); // [0, 1]
        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(0, 3); // [0, 1, 2]
        let tokensAmount = new BN(0);

        let lotId = accTwoLotsIds[0];

        await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: commissionOffer });

        let offersAmount = new BN(2);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("expect revert if make offer with zero for crypto", async () => {
        let accTwoLotsIds = [];
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[1];

        let accOneExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(1).mul(tokenbits);

        await expectRevert(
            MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, constants.ZERO_ADDRESS, tokensAmount, { from: accountOne }),
            "revert"
        );
    });

    it("make offer with tokens", async () => {
        let accTwoLotsIds = [];
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[1];

        let accOneExchangeNFTindexes = [];
        let accThreeExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountOne }); 

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountThree });

        let offersAmount = new BN(2);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("make offer with NFT + tokens", async () => {
        let accOneLotsIds = [], accTwoLotsIds = [], accThreeLotsIds = [];

        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let lotId = accTwoLotsIds[2];

        let accOneExchangeNFTindexes = accOneLotsIds.slice(2, 5); // [2, 3, 4]
        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(3, 4); // [3]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, ERC20Address, 
                tokensAmount, { from: accountThree, value: commissionOffer });

        let offersAmount = new BN(2);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("make offer with cryptocurrancy", async () => {
        let accTwoLotsIds = [];
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[3];

        let accOneExchangeNFTindexes = [];
        let accThreeExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(10).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        let offersAmount = new BN(2);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");    
    });

    it("make offer with NFT + cryptocurrancy", async () => {
        let accOneLotsIds = [], accTwoLotsIds = [], accThreeLotsIds = [];

        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let lotId = accTwoLotsIds[4];

        let accOneExchangeNFTindexes = accOneLotsIds.slice(5, 6); // [5]
        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(4, 6); // [4, 5]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(6).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        let offersAmount = new BN(2);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("shoud NOT make offer with tokens and cryptocurrancy", async () => {
        let accTwoLotsIds = [];
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[5];

        let accOneExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(100).mul(tokenbits);
        let cryptoProposalAmount = new BN(10).mul(tokenbits);

        await expectRevert(
            MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, 
                tokensAmount, { from: accountOne, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) }),
            "revert"
        );
    });

    it("shoud NOT make offer with tokens, cryptocurrancy and NFT", async () => {
        let accOneLotsIds = [];
        let accTwoLotsIds = [];
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[6];

        let accOneExchangeNFTindexes = accOneLotsIds.slice(6, 7); // [6]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(100).mul(tokenbits);
        let cryptoProposalAmount = new BN(10).mul(tokenbits);

        await expectRevert( 
            MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, 
                tokensAmount, { from: accountOne, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) }),
            "revert"
        );    
    });

    it("make several different offers", async () => {
        let accOneLotsIds = [], accTwoLotsIds = [], accThreeLotsIds = [];

        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        let lotId = accTwoLotsIds[7];

        let accOneExchangeNFTindexes = accOneLotsIds.slice(7, 8); // [7]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(150).mul(tokenbits);

        // accountOne make offer NFT + tokens
        await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(6, 10); // [6, 7, 8, 9]
        let accThreeTokensAmount = new BN(0);  

        // accountThree make offer NFT
        await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            accThreeTokensAmount, { from: accountThree, value: commissionOffer });

        let accFourExchangeNFTindexes = [];
        let accFourTokensAmount = new BN(0);  
        let cryptoProposalAmount = new BN(15).mul(tokenbits); 

        // accountFour make offer crypto
        await MarketPlace.makeOffer(lotId, accFourExchangeNFTindexes, constants.ZERO_ADDRESS, 
            accFourTokensAmount, { from: accountFour, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });  // check offers

        let offersAmount = new BN(3);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("check 'NFT_Offer' functionality with NFT-1155 for tokens", async () => {
        let accTwoLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[7];

        let accFourNFT1155value = new BN(100);
        let isERC1155 = true;

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(150).mul(tokenbits);

        await MarketPlace.NFT_Offer([ERC1155Address], [accFourNFT1155id], [accFourNFT1155value], 
            [isERC1155], lotId, ERC20Address, tokensAmount, NFTdata, { from: accountFour, value: commissionOffer });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.getLots(lotLength - 1, { from: accountFour });  
        
        assert.equal(lotInfo.creationInfo.owner, accountFour, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC1155Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, accFourNFT1155value, "NFT amount is wrong");

        let offersAmount = new BN(4); // 3 from 'make several different offers' test
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("check 'NFT_Offer' functionality with NFT-1155 for crypto", async () => {
        let accTwoLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[7];

        let accFourNFT1155value = new BN(100);
        let isERC1155 = true;

        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(1).mul(tokenbits);
        let tokensAmount = new BN(0);

        await MarketPlace.NFT_Offer([ERC1155Address], [accFourNFT1155id], [accFourNFT1155value], 
            [isERC1155], lotId, constants.ZERO_ADDRESS, tokensAmount, NFTdata, 
            { from: accountFour, value: (Number(commissionOffer) + Number(cryptoAmount)) });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.getLots(lotLength - 1, { from: accountFour });  
        
        assert.equal(lotInfo.creationInfo.owner, accountFour, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC1155Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, accFourNFT1155value, "NFT amount is wrong");

        let offersAmount = new BN(5); // 4 from previous test
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("check 'NFT_Offer' functionality with NFT-721 for tokens", async () => {
        let accTwoLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[7];

        let value = new BN(1);
        let isERC1155 = false;

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(150).mul(tokenbits);

        await MarketPlace.NFT_Offer([ERC721Address], [accFourNFT721ids[0]], [value], 
            [isERC1155], lotId, ERC20Address, tokensAmount, NFTdata, { from: accountFour, value: commissionOffer });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.getLots(lotLength - 1, { from: accountFour });  
        
        assert.equal(lotInfo.creationInfo.owner, accountFour, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC721Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, value, "NFT amount is wrong");

        let offersAmount = new BN(6); // 5 from previous test
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("check 'NFT_Offer' functionality with NFT-721 for crypto", async () => {
        let accTwoLotsIds = [];

        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[7];

        let value = new BN(1);
        let isERC1155 = false;

        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(1).mul(tokenbits);
        let tokensAmount = new BN(0);

        await MarketPlace.NFT_Offer([ERC721Address], [accFourNFT721ids[1]], [value], 
            [isERC1155], lotId, constants.ZERO_ADDRESS, tokensAmount, NFTdata, 
            { from: accountFour, value: (Number(commissionOffer) + Number(cryptoAmount)) });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.getLots(lotLength - 1, { from: accountFour });  
        
        assert.equal(lotInfo.creationInfo.owner, accountFour, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC721Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, value, "NFT amount is wrong");

        let offersAmount = new BN(7); // 6 from previous test
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("cancel offer with NFT", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        let lotOffers = [];

        for(let i = 0; i < getInfoAccOne.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccOne.userOffers[i]));
        }

        let offeredNFTAmount = new BN(20); // from "make offer with NFT" [0, 1]

        await MarketPlace.cancelOffer(lotOffers[0], { from: accountOne });
        let accOneNFTBalance = await ERC1155.balanceOf(accountOne, accOneNFT1155id, { from: accountOne });

        assert.equal(Number(offeredNFTAmount), accOneNFTBalance, "offer with NFT is not canceled");
    });

    it("cancel offer with tokens", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        let lotOffers = [];

        for(let i = 0; i < getInfoAccOne.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccOne.userOffers[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);

        let accOneTokensBalanceBefore = await ERC20.balanceOf(accountOne, { from: accountOne });  

        await MarketPlace.cancelOffer(lotOffers[1], { from: accountOne });
        let accOneTokensBalanceAfter = await ERC20.balanceOf(accountOne, { from: accountOne });
 
        assert.equal((Number(accOneTokensBalanceBefore) + Number(tokensAmount)), accOneTokensBalanceAfter, "balance of tokens after canceled is wrong"); // UNCOMMENTED
    });

    it("cancel offer with NFT + tokens", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        let lotOffers = [];

        for(let i = 0; i < getInfoAccOne.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccOne.userOffers[i]));
        }

        let offeredNFTAmount = new BN(30); // from "make offer with NFT + tokens" [2, 3, 4]

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);

        let accOneNFTBalanceBefore = await ERC1155.balanceOf(accountOne, accOneNFT1155id, { from: accountOne });
        let accOneTokensBalanceBefore = await ERC20.balanceOf(accountOne, { from: accountOne });  

        await MarketPlace.cancelOffer(lotOffers[2], { from: accountOne });

        let accOneNFTBalanceAfter = await ERC1155.balanceOf(accountOne, accOneNFT1155id, { from: accountOne });
        let accOneTokensBalanceAfter = await ERC20.balanceOf(accountOne, { from: accountOne });

        assert.equal((Number(accOneNFTBalanceBefore) + Number(offeredNFTAmount)), accOneNFTBalanceAfter, "balance of NFT after canceled is wrong");
        assert.equal((Number(accOneTokensBalanceBefore) + Number(tokensAmount)), accOneTokensBalanceAfter, "balance of tokens after canceled is wrong");
    });

    it("cancel offer with cryptocurrancy", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        let lotOffers = [];

        for(let i = 0; i < getInfoAccOne.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccOne.userOffers[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));

        let cryptoProposalAmount = new BN(10); // from "make offer with cryptocurrancy"
        let commision = commissionOffer / tokenbits;
        
        let accOneCryptoBalanceBefore = (await web3.eth.getBalance(accountOne) / tokenbits).toFixed(0);

        await MarketPlace.cancelOffer(lotOffers[3], { from: accountOne });

        let accOneCryptoBalanceAfter = (await web3.eth.getBalance(accountOne) / tokenbits).toFixed(0);

        assert.equal((Number(accOneCryptoBalanceBefore) + Number(cryptoProposalAmount) + Number(commision)), accOneCryptoBalanceAfter, 
            "balance of crypto after canceled is wrong");
    });

    it("cancel offer with NFT + cryptocurrancy", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        let lotOffers = [];

        for(let i = 0; i < getInfoAccOne.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccOne.userOffers[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));

        let offeredNFTAmount = new BN(10); // from "make offer with NFT + cryptocurrancy" [5]
        let cryptoProposalAmount = new BN(6); // from "make offer with NFT + cryptocurrancy"
        let commision = commissionOffer / tokenbits;

        let accOneNFTBalanceBefore = await ERC1155.balanceOf(accountOne, accOneNFT1155id, { from: accountOne });
        let accOneCryptoBalanceBefore = (await web3.eth.getBalance(accountOne) / tokenbits).toFixed(0);

        await MarketPlace.cancelOffer(lotOffers[4], { from: accountOne });

        let accOneNFTBalanceAfter = await ERC1155.balanceOf(accountOne, accOneNFT1155id, { from: accountOne });
        let accOneCryptoBalanceAfter = (await web3.eth.getBalance(accountOne) / tokenbits).toFixed(0);

        assert.equal((Number(accOneNFTBalanceBefore) + Number(offeredNFTAmount)), accOneNFTBalanceAfter, "balance of NFT after canceled is wrong");
        assert.equal((Number(accOneCryptoBalanceBefore) + Number(cryptoProposalAmount) + Number(commision)), accOneCryptoBalanceAfter, 
            "balance of crypto after canceled is wrong");
    });

    it("should NOT cancel offer if not owner of propose", async () => {
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });
        let lotOffers = [];

        for(let i = 0; i < getInfoAccThree.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccThree.userOffers[i]));
        }

        await expectRevert(
            MarketPlace.cancelOffer(lotOffers[0], { from: accountTwo }),
            "revert"
        );
    });

    it("choose offer with NFT", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let offeredNFTAmount = new BN(45); // from "make offer with NFT" [0, 1, 2]
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal
        let lotId = accTwoLotsIds[0];

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });
   
        await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });

        let accThreeNFTBalance = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accTwoNFTBalance = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo });
        assert.equal(Number(accThreeNFTBalance), proposalNFTAmount, "accountTree NFT balance is wrong");
        assert.equal(Number(accTwoNFTBalance), offeredNFTAmount, "accountTwo NFT balance is wrong");
    });

    it("choose offer with tokens", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);
        let lotId = accTwoLotsIds[1];
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal
        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accTwoTokensBalanceBefore = await ERC20.balanceOf(accountTwo, { from: accountTwo });
        let receivedMarketCommission = await MarketPlace.marketCommission({ from: accountTwo });

        let expectedTokensProfit = tokensAmount - ((tokensAmount.mul(receivedMarketCommission)).div(new BN(1000)));

        await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });

        let accThreeNFTBalanceAfter = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accTwoTokensBalanceAfter = await ERC20.balanceOf(accountTwo, { from: accountTwo });

        assert.equal((Number(accThreeNFTBalanceAfter) - Number(accThreeNFTBalanceBefore)), proposalNFTAmount, 
            "accountTree NFT balance is wrong");
        assert.equal((Number(accTwoTokensBalanceAfter) - Number(accTwoTokensBalanceBefore)), expectedTokensProfit, 
            "accountTwo tokens balance is wrong");
    });

    it("choose offer with NFT + tokens", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[2];
        let offeredNFTAmount = new BN(15); // from "make offer with NFT + tokens" [3]
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal
        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });
        let accTwoNFTBalanceBefore = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo });   
        let accTwoTokensBalanceBefore = await ERC20.balanceOf(accountTwo, { from: accountTwo });
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);
        let receivedMarketCommission = await MarketPlace.marketCommission({ from: accountTwo });

        let expectedTokensProfit = tokensAmount - ((tokensAmount.mul(receivedMarketCommission)).div(new BN(1000)));

        await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });
       
        let accTwoNFTBalanceAfter = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo }); 
        let accTwoTokensBalanceAfter = await ERC20.balanceOf(accountTwo, { from: accountTwo });
        let accThreeNFTBalanceAfter = await ERC721.balanceOf(accountThree, { from: accountThree });

        assert.equal((Number(accThreeNFTBalanceAfter) - Number(accThreeNFTBalanceBefore)), proposalNFTAmount, 
            "accountTree NFT balance is wrong");
        assert.equal((Number(accTwoTokensBalanceAfter) - Number(accTwoTokensBalanceBefore)), expectedTokensProfit, 
            "accountTwo tokens balance is wrong");
        assert.equal((Number(accTwoNFTBalanceAfter) - Number(accTwoNFTBalanceBefore)), offeredNFTAmount,
            "accountTwo NFT balance is wrong");
    });

    it("choose offer with cryptocurrancy", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[3];
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        let cryptoProposalAmount = new BN(10).mul(tokenbits);
        let receivedCommission = await MarketPlace.marketCommission({ from: accountTwo });
        
        let accTwoCryptoBalanceBefore = (await web3.eth.getBalance(accountTwo));
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });

        const gasUsed = receipt.receipt.gasUsed;

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        let accTwoCryptoBalanceAfter = (await web3.eth.getBalance(accountTwo));
        let accThreeNFTBalanceAfter = await ERC721.balanceOf(accountThree, { from: accountThree });

        let rewardWithCommission = cryptoProposalAmount.sub((cryptoProposalAmount.mul(receivedCommission)).div(new BN(1000)));
        let expectedaccTwoBalance = (rewardWithCommission.add(new BN(accTwoCryptoBalanceBefore))).sub(gasFee);
        
        assert.equal(accTwoCryptoBalanceAfter, expectedaccTwoBalance, "accountTwo balance is wrong after choosed offer");
        assert.equal(String(accThreeNFTBalanceAfter.sub(accThreeNFTBalanceBefore)), proposalNFTAmount, 
            "accountTree NFT balance is wrong");
    });

    it("choose offer with NFT + cryptocurrancy", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[4];
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal
        let offeredNFTAmount = new BN(30); // from "make offer with NFT + cryptocurrancy" [4, 5]

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        let cryptoProposalAmount = new BN(6).mul(tokenbits);
        let receivedCommission = await MarketPlace.marketCommission({ from: accountTwo });

        let accTwoCryptoBalanceBefore = (await web3.eth.getBalance(accountTwo));
        let accTwoNFTBalanceBefore = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo }); 
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });

        const gasUsed = receipt.receipt.gasUsed;

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        let accTwoCryptoBalanceAfter = (await web3.eth.getBalance(accountTwo));
        let accTwoNFTBalanceAfter = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo });
        let accThreeNFTBalanceAfter = await ERC721.balanceOf(accountThree, { from: accountThree });

        let rewardWithCommission = cryptoProposalAmount.sub((cryptoProposalAmount.mul(receivedCommission)).div(new BN(1000)));
        let expectedaccTwoBalance = (rewardWithCommission.add(new BN(accTwoCryptoBalanceBefore))).sub(gasFee);
        
        assert.equal(accTwoCryptoBalanceAfter, expectedaccTwoBalance, "accountTwo balance is wrong after choosed offer");
        assert.equal(String(accTwoNFTBalanceAfter.sub(accTwoNFTBalanceBefore)), offeredNFTAmount,
            "accountTwo NFT balance is wrong");
        assert.equal(String(accThreeNFTBalanceAfter.sub(accThreeNFTBalanceBefore)), proposalNFTAmount, 
            "accountTree NFT balance is wrong");
    });

    it("should NOT choose offer if not owner", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountOne });
        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[7];

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        await expectRevert(
            MarketPlace.chooseOffer(lotId, lotOffers[0], NFTdata, { from: accountOne }),
            "revert"
        );
    });

    it("check if user who made offer cannot put up for sell", async () => {
        let accThreeLotsIds = [];
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let lotStartDate = Math.floor(Date.now() / 1000);

        let openForOffers = false;

        await expectRevert(
            MarketPlace.sell(accThreeLotsIds[7], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountThree }),
            "revert"
        );

    });

    it("check return of unselected offers", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let accTwoOfferedNFTAmount = new BN(60); // from "make several different offers" [6, 7, 8, 9]
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal
        let accOneOfferedNFTAmount = new BN(10); // from "make several different offers" [7]
        let tokensAmount = new BN(150).mul(tokenbits);

        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accTwoNFTBalanceBefore = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo });
        let accOneNFTBalanceBefore = await ERC1155.balanceOf(accountOne, accOneNFT1155id, { from: accountOne });
        let accOneTokensBalanceBefore = await ERC20.balanceOf(accountOne, { from: accountOne });

        let lotId = accTwoLotsIds[7];
        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });
        await MarketPlace.cancelOffer(lotOffers[0], { from: accountOne });
        
        let accThreeNFTBalanceAfter = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accTwoNFTBalanceAfter = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo });
        let accOneNFTBalanceAfter = await ERC1155.balanceOf(accountOne, accOneNFT1155id, { from: accountOne });
        let accOneTokensBalanceAfter = await ERC20.balanceOf(accountOne, { from: accountOne });

        assert.equal(Number(accThreeNFTBalanceAfter) - Number(accThreeNFTBalanceBefore), proposalNFTAmount, "accountTree NFT balance is wrong");
        assert.equal(Number(accTwoNFTBalanceAfter) - Number(accTwoNFTBalanceBefore), accTwoOfferedNFTAmount, "accountTwo NFT balance is wrong");

        assert.equal((Number(accOneNFTBalanceAfter) - Number(accOneNFTBalanceBefore)), accOneOfferedNFTAmount,
            "accountOne NFT balance is wrong");
        assert.equal((Number(accOneTokensBalanceAfter) - Number(accOneTokensBalanceBefore)), tokensAmount, 
            "accountOne tokens balance is wrong");
    });

    it("check if owner of exposed NFT can pick it up before exchange", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[8];
        let accOneExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(10).mul(tokenbits);

        await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountOne });

        let accTwoNFTBalanceBefore = await ERC721.balanceOf(accountTwo, { from: accountTwo });
        await MarketPlace.getBack(lotId, NFTdata, { from: accountTwo });
        let accTwoNFTBalanceAfter = await ERC721.balanceOf(accountTwo, { from: accountTwo });

        assert.equal(String(accTwoNFTBalanceAfter), accTwoNFTBalanceBefore.add(new BN(1)), "owner didn't return NFT back");
    });
})