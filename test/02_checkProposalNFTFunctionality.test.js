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

    let addNFT721Num = 8;

    const accOneNFT1155id = new BN(1);
    const accThreeNFT1155id = new BN(2);
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
    });

    it("reset market commission", async () => {
        let marketCommission = new BN(150);

        await MarketPlace.setMarketCommission(marketCommission, {from: deployer});

        let receivedMarketCommission = await MarketPlace.marketCommission({from: deployer});
        assert.equal(Number(receivedMarketCommission), marketCommission, "market comission is wrong");
    });

    it("reset offer commission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(16));
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
        let accOneTokensAmount = new BN(1000).mul(tokenbits);

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

        await ERC20.mint(accountOne, accOneTokensAmount, { from: accountOne });
        await ERC20.approve(MarketPlaceAddress, accOneTokensAmount, { from: accountOne });

        await ERC20.mint(accountThree, accOneTokensAmount, { from: accountThree });
        await ERC20.approve(MarketPlaceAddress, accOneTokensAmount, { from: accountThree });

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

        for(let i = 0; i < addNFTNum; i++) {
            await MarketPlace.add(ERC1155Address, accOneNFT1155id, accOneNFT1155value, isERC1155, NFTdata, { from: accountOne });
            await MarketPlace.add(ERC1155Address, accThreeNFT1155id, accThreeNFT1155value, isERC1155, NFTdata, { from: accountThree });
        }
        // console.log(Number(await ERC1155.balanceOf(accountThree, accThreeNFT1155id)));        

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

        for(let i = 0; i < addNFT721Num; i++) {
            await MarketPlace.add(ERC721Address, NFT721ids[i], NFT721value, isERC1155, NFTdata, { from: accountTwo });
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

    it("sell NFT with zero price for cryptocurrency", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(0));
        let lotStartDate = Math.floor(Date.now() / 1000);

        let lotInfo;

        for(let i = 0; i < addNFT721Num; i++) {
            await MarketPlace.sell(userLotsIds[i], constants.ZERO_ADDRESS, lotPrice, lotStartDate, { from: accountTwo });

            lotInfo = await MarketPlace.lots(userLotsIds[i], { from: accountTwo });
        
            assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
            assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
        }     
    });

    // it with make offer unfinished

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

        await MarketPlace.makeOffer(accTwoLotsIds[0], accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        await MarketPlace.makeOffer(accTwoLotsIds[0], accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: commissionOffer });


        // getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        // let lotOffersInfo = await MarketPlace.getLotsOffers([accTwoLotsIds[0]], { from: accountTwo }); // TODO
        // console.log(lotOffersInfo); 

        // console.log(getInfoAccOne);
        // console.log(getInfoAccTwo);
    });

    it("make offer with tokens", async () => {
        let accTwoLotsIds = [];
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        // console.log(accTwoLotsIds);

        let accOneExchangeNFTindexes = [];
        let accThreeExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);

        // console.log(await MarketPlace.lots(accTwoLotsIds[1], { from: accountTwo }));

        // await expectRevert(
        //     MarketPlace.makeOffer(accTwoLotsIds[1], accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 0, { from: accountOne }),  // UNCOMMENTED
        //     "You send 0 tokens"
        // );

        // await expectRevert(
        //     MarketPlace.makeOffer(accTwoLotsIds[1], accOneExchangeNFTindexes, constants.ZERO_ADDRESS, tokensAmount, { from: accountOne }),  // UNCOMMENTED
        //     "revert"
        // );

        await MarketPlace.makeOffer(accTwoLotsIds[1], accOneExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountOne }); // FIX (REMOVE commisionOffer)

        await MarketPlace.makeOffer(accTwoLotsIds[1], accThreeExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountThree });

        // console.log(await MarketPlace.getLotsOffers(accTwoLotsIds[1], { from: accountTwo }));
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

        let accOneExchangeNFTindexes = accOneLotsIds.slice(2, 5); // [2, 3, 4]
        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(3, 4); // [3]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);

        await MarketPlace.makeOffer(accTwoLotsIds[2], accOneExchangeNFTindexes, ERC20Address, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        // await expectRevert(
        //     MarketPlace.makeOffer(accTwoLotsIds[2], accThreeExchangeNFTindexes, constants.ZERO_ADDRESS,  // UNCOMMENTED
        //         tokensAmount, { from: accountThree, value: commissionOffer }),
        //         "revert"
        // );

        await MarketPlace.makeOffer(accTwoLotsIds[2], accThreeExchangeNFTindexes, ERC20Address, 
                tokensAmount, { from: accountThree, value: commissionOffer });
    });

    it("make offer with cryptocurrancy", async () => {
        let accTwoLotsIds = [];
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let accOneExchangeNFTindexes = [];
        let accThreeExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(10).mul(tokenbits);


        await MarketPlace.makeOffer(accTwoLotsIds[3], accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        await MarketPlace.makeOffer(accTwoLotsIds[3], accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });
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

        let accOneExchangeNFTindexes = accOneLotsIds.slice(5, 6); // [5]
        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(4, 6); // [4, 5]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(2).mul(tokenbits);

        await MarketPlace.makeOffer(accTwoLotsIds[4], accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        await MarketPlace.makeOffer(accTwoLotsIds[4], accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });
    });

    it("shoud NOT make offer with tokens and cryptocurrancy", async () => {
        let accTwoLotsIds = [];
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(Number(getInfoAccTwo.userLots[i]));
        }

        let accOneExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(100).mul(tokenbits);
        let cryptoProposalAmount = new BN(10).mul(tokenbits);

        await expectRevert(
            MarketPlace.makeOffer(accTwoLotsIds[5], accOneExchangeNFTindexes, ERC20Address, 
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

        let accOneExchangeNFTindexes = accOneLotsIds.slice(6, 7); // [6]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(100).mul(tokenbits);
        let cryptoProposalAmount = new BN(10).mul(tokenbits);

        await expectRevert( 
            MarketPlace.makeOffer(accTwoLotsIds[6], accOneExchangeNFTindexes, ERC20Address, 
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

        let accOneExchangeNFTindexes = accOneLotsIds.slice(7, 8); // [7]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(150).mul(tokenbits);

        // accountOne make offer NFT + tokens
        await MarketPlace.makeOffer(accTwoLotsIds[7], accOneExchangeNFTindexes, ERC20Address, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(6, 10); // [6, 7, 8, 9]
        let accThreeTokensAmount = new BN(0);  

        // accountThree make offer NFT
        await MarketPlace.makeOffer(accTwoLotsIds[7], accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            accThreeTokensAmount, { from: accountThree, value: commissionOffer });

        let accFourExchangeNFTindexes = [];
        let accFourTokensAmount = new BN(0);  
        let cryptoProposalAmount = new BN(15).mul(tokenbits); 

        // accountFour make offer crypto
        await MarketPlace.makeOffer(accTwoLotsIds[7], accFourExchangeNFTindexes, constants.ZERO_ADDRESS, 
            accFourTokensAmount, { from: accountFour, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });
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
 
        // assert.equal((Number(accOneTokensBalanceBefore) + Number(tokensAmount)), accOneTokensBalanceAfter, "balance of tokens after canceled is wrong"); // UNCOMMENTED
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

        console.log(Number(accOneNFTBalanceBefore));
        await MarketPlace.cancelOffer(lotOffers[2], { from: accountOne });

        let accOneNFTBalanceAfter = await ERC1155.balanceOf(accountOne, accOneNFT1155id, { from: accountOne });
        let accOneTokensBalanceAfter = await ERC20.balanceOf(accountOne, { from: accountOne });
        console.log(Number(accOneNFTBalanceAfter));

        // assert.equal((Number(accOneNFTBalanceBefore) + Number(offeredNFTAmount)), accOneNFTBalanceAfter, "balance of NFT after canceled is wrong");
        // assert.equal((Number(accOneTokensBalanceBefore) + Number(tokensAmount)), accOneTokensBalanceAfter, "balance of tokens after canceled is wrong");
    });

    it("cancel offer with cryptocurrancy", async () => {});

    it("cancel offer with NFT + cryptocurrancy", async () => {});

    it("should NOT cancel offer if not owner of propose", async () => {
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        let lotOffers = [];

        for(let i = 0; i < getInfoAccOne.userOffers.length; i++) {
            lotOffers.push(Number(getInfoAccOne.userOffers[i]));
        }

        await expectRevert(
            MarketPlace.cancelOffer(lotOffers[1], { from: accountTwo }),
            "You are not the owner!(cancel offer)"
        );
    });

    it("choose offer with NFT", async () => {});

    it("choose offer with tokens", async () => {});

    it("choose offer with NFT + tokens", async () => {});

    it("choose offer with cryptocurrancy", async () => {});

    it("choose offer with NFT + cryptocurrancy", async () => {});

    it("should NOT choose offer if not owner", async () => {});
})