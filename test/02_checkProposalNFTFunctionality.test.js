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
    const [deployer, accountOne, accountTwo] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace;
    let ERC1155Address, ERC721Address, ERC20Address, MarketPlaceAddress;

    let comissionOffer;

    const NFT1155id = new BN(1);
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

    it("reset market comission", async () => {
        let marketComission = new BN(150);

        await MarketPlace.setMarketComission(marketComission, {from: deployer});

        let receivedMarketComission = await MarketPlace.marketComission({from: deployer});
        assert.equal(Number(receivedMarketComission), marketComission, "market comission is wrong");
    });

    it("reset offer comission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(16));
        comissionOffer = new BN(5).mul(tokenbits);

        await MarketPlace.setOfferComission(comissionOffer, {from: deployer});

        let receivedOfferComission = await MarketPlace.offerComission({from: deployer});
        assert.equal(Number(receivedOfferComission), comissionOffer, "offer comission is wrong");
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
        const accTwoNFT1155amount = new BN(50);
        const NFTapproved = true;

        await ERC1155.mint(accountOne, NFT1155id, accOneNFT1155amount, NFTdata, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        await ERC1155.mint(accountTwo, NFT1155id, accTwoNFT1155amount, NFTdata, { from: accountTwo });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountTwo });

        let addNFTNum = 6;

        for(let i = 0; i < addNFTNum; i++) {
            NFT721ids.push(new BN(i));
            await ERC721.mint(accountTwo, NFT721ids[i], { from: accountTwo });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountTwo });
        }

        await ERC20.mint(accountTwo, accOneTokensAmount, { from: accountTwo });
        await ERC20.approve(MarketPlaceAddress, accOneTokensAmount, { from: accountTwo });

        let canTransfer = true;

        await MarketPlace.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });
    });

    it("users should be able to add NFT ERC-1155", async () => {
        let accOneBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, NFT1155id, { from: accountOne });

        let NFT1155value = new BN(10);
        let isERC1155 = true;
        let addNFTNum = 7; // max 10

        for(let i = 0; i < addNFTNum; i++) {
            await MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, NFTdata, { from: accountOne });
        }      

        let accOneBalanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, NFT1155id, { from: accountOne });

        assert.notEqual(accOneBalanceBeforeTransfer, accOneBalanceAfterTransfer, "before add NFT-1155 to Market Place and after should not be equal");
        assert.equal(Number(accOneBalanceAfterTransfer), (Number(NFT1155value) * addNFTNum), "after add NFT-1155 to Market Place amount is wrong");
    });

    it("users should be able to add NFT ERC-721", async () => {
        let accTwoBalanceBeforeTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountTwo });
        let NFT721value = new BN(1);
        let isERC1155 = false;

        let addNFTNum = 6;

        for(let i = 0; i < addNFTNum; i++) {
            await MarketPlace.add(ERC721Address, NFT721ids[i], NFT721value, isERC1155, NFTdata, { from: accountTwo });
        }

        let accTwoBalanceAfterTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountTwo });

        assert.notEqual(accTwoBalanceBeforeTransfer, accTwoBalanceAfterTransfer, "before add NFT-721 to Market Place and after should not be equal");
        assert.equal(Number(accTwoBalanceAfterTransfer), (Number(NFT721value) * addNFTNum), "after add NFT-721 to Market Place amount is wrong");
    });

    it("sell NFT with zero price for cryptocurrency", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(0));
        let lotStartDate = Math.floor(Date.now() / 1000);

        let addNFTNum = 6;

        for(let i = 0; i < addNFTNum; i++) {
            await MarketPlace.sell(userLotsIds[i], constants.ZERO_ADDRESS, lotPrice, lotStartDate, { from: accountTwo });
        }

        let lotInfo;
        for(let i = 0; i < addNFTNum; i++) {
            lotInfo = await MarketPlace.lots(userLotsIds[i], { from: accountTwo });
        
            assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
            assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
        }
        
    });

    // it with make offer unfinished

    it("make offer with NFT", async () => {
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
        // console.log(accOneLotsIds);
        // console.log(accTwoLotsIds);

        let accOneExchangeNFTindexes = [0, 1];
        let tokensAmount = new BN(0);

        await MarketPlace.makeOffer(accTwoLotsIds[0], accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: comissionOffer });
        getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountTwo });
        // console.log(getInfoAccOne);
        // console.log(getInfoAccTwo);
    });

    it("make offer with tokens", async () => {
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

        console.log(accTwoLotsIds);

        let accOneExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);

        await MarketPlace.makeOffer(accTwoLotsIds[1], accOneExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountOne });
    });

    it("make offer with NFT + tokens", async () => {
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

        let accOneExchangeNFTindexes = [2, 3, 4];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);

        await MarketPlace.makeOffer(accTwoLotsIds[2], accOneExchangeNFTindexes, ERC20Address, 
            tokensAmount, { from: accountOne, value: comissionOffer });
    });

    it("make offer with cryptocurrancy", async () => {
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

        let accOneExchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(10).mul(tokenbits);


        await MarketPlace.makeOffer(accTwoLotsIds[3], accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: (Number(comissionOffer) + Number(cryptoProposalAmount)) });
    });

    it("make offer with NFT + cryptocurrancy", async () => {
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

        let accOneExchangeNFTindexes = [5];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(2).mul(tokenbits);

        await MarketPlace.makeOffer(accTwoLotsIds[4], accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: (Number(comissionOffer) + Number(cryptoProposalAmount)) });
    });

    it("shoud NOT make offer with tokens and cryptocurrancy", async () => {
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

        let accOneExchangeNFTindexes = [0];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(100).mul(tokenbits);
        let cryptoProposalAmount = new BN(10).mul(tokenbits);

        await MarketPlace.makeOffer(accTwoLotsIds[5], accOneExchangeNFTindexes, ERC20Address, 
            tokensAmount, { from: accountOne, value: (Number(comissionOffer) + Number(cryptoProposalAmount)) });
    });
})