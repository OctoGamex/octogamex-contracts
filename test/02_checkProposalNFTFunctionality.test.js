const NFT1155 = artifacts.require("TestERC1155");
const NFT721 = artifacts.require("TestERC721");
const Tokens = artifacts.require("TestERC20");
const Marketplace = artifacts.require("NFTMarketplace");
const Admin = artifacts.require("Admin");

const {
    BN,
    expectEvent,  
    expectRevert, 
    time,
    constants
} = require('@openzeppelin/test-helpers');

contract("proposal NFT functionality", async accounts => {
    const [deployer, accountOne, accountTwo, accountThree, accountFour] = accounts;

    let MarketPlace, AdminContract;
    let MarketPlaceAddress, AdminContractAddress;

    let ERC1155, ERC721, ERC20;
    let ERC1155Address, ERC721Address, ERC20Address;

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

        AdminContract = await Admin.deployed({from: deployer});
        AdminContractAddress = AdminContract.address;

        MarketPlace = await Marketplace.deployed({from: deployer});
        MarketPlaceAddress = MarketPlace.address;

        await AdminContract.setMarketContract(MarketPlaceAddress, { from: deployer });

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

        let isERC20Supported = true;
        await AdminContract.setERC20_Support(ERC1155Address, [ERC20Address], [isERC20Supported], { from: deployer });
        await AdminContract.setERC20_Support(ERC721Address, [ERC20Address], [isERC20Supported], { from: deployer });
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
    });

    it("users should be able to add NFT ERC-1155", async () => {
        let accOneBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accOneNFT1155id, { from: accountOne });
        let accThreeBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accThreeNFT1155id, { from: accountThree });

        let accOneNFT1155value = new BN(10);
        let accThreeNFT1155value = new BN(15);
        let isERC1155 = true;
        let addNFTNum = 10; // max 10
        let lotType = 3; // lotType.Exchange

        let receipt;
        let date;
        for(let i = 0; i < addNFTNum; i++) {
            receipt = await MarketPlace.add(ERC1155Address, accOneNFT1155id, accOneNFT1155value, isERC1155, lotType, NFTdata, { from: accountOne });
            date = (await web3.eth.getBlock("latest")).timestamp;
            await MarketPlace.add(ERC1155Address, accThreeNFT1155id, accThreeNFT1155value, isERC1155, lotType, NFTdata, { from: accountThree });

            expectEvent(receipt, 'AddNFT', {
                user: accountOne,
                contractAddress: ERC1155Address,
                NFT_ID: accOneNFT1155id,
                lotID: ((i == 0) ? new BN(i) : (i == 1) ? new BN(i + 1) : new BN(i * 2)),
                datetime: new BN(date),
                amount: accOneNFT1155value,
                typeOfLot: new BN(lotType)
            });
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

        let receipt;
        let date;
        for(let i = 0; i < addNFT721Num; i++) {           
            receipt = await MarketPlace.add(ERC721Address, NFT721ids[i], NFT721value, isERC1155, lotType, NFTdata, { from: accountTwo });
            date = (await web3.eth.getBlock("latest")).timestamp;

            expectEvent(receipt, 'AddNFT', {
                user: accountTwo,
                contractAddress: ERC721Address,
                NFT_ID: NFT721ids[i],
                lotID: new BN(i + 20), // addNFTNum * 2 (ERC1155 from accountOne & accountThree)
                datetime: new BN(date),
                amount: NFT721value,
                typeOfLot: new BN(lotType)
            });
        }

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotInfo = await MarketPlace.lots([userLotsIds[0]], { from: accountTwo });  
        assert.equal(accountTwo, lotInfo.creationInfo.owner, "lot information is wrong");

        let accTwoBalanceAfterTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountTwo });

        assert.notEqual(accTwoBalanceBeforeTransfer, accTwoBalanceAfterTransfer, "before add NFT-721 to Market Place and after should not be equal");
        assert.equal(Number(accTwoBalanceAfterTransfer), (Number(NFT721value) * addNFT721Num), "after add NFT-721 to Market Place amount is wrong");
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
        let receipt;

        for(let i = 0; i < addNFT721Num; i++) {
            receipt = await MarketPlace.sell(userLotsIds[i], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountTwo });

            lotInfo = await MarketPlace.lots(userLotsIds[i], { from: accountTwo });

            // expectEvent(receipt, "ExchangeNFT", {
            //     startDate: lotStartDate,
            //     lotID: new BN(userLotsIds[i]),
            //     owner: accountTwo,
            //     amount: lotInfo.creationInfo.amount
            // });
     
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
            accOneLotsIds.push(new BN(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(new BN(getInfoAccThree.userLots[i]));
        }

        let accOneExchangeNFTindexes = accOneLotsIds.slice(0, 2); // [0, 1]
        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(0, 3); // [0, 1, 2]
        let tokensAmount = new BN(0);

        let lotId = accTwoLotsIds[0];

        let firstReceipt = await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });      
        let offersAccOneLength = getInfoAccOne.userOffers.length;
        let offerIdAccOne = getInfoAccOne.userOffers[offersAccOneLength - 1];

        expectEvent(firstReceipt, "MakeOffer", {
            user: accountOne,
            lotID: new BN(lotId),
            offerID: offerIdAccOne,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: tokensAmount,
            itemLotIds: accOneExchangeNFTindexes,
            tokenValue: new BN(0)
        });

        let secondReceipt = await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: commissionOffer });

        getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });      
        let offersAccThreeLength = getInfoAccThree.userOffers.length;
        let offerIdAccThree = getInfoAccThree.userOffers[offersAccThreeLength - 1];

        expectEvent(secondReceipt, "MakeOffer", {
            user: accountThree,
            lotID: new BN(lotId),
            offerID: offerIdAccThree,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: tokensAmount,
            itemLotIds: accThreeExchangeNFTindexes,
            tokenValue: new BN(0)
        });

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

        let firstReceipt = await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountOne });
        
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });      
        let offersAccOneLength = getInfoAccOne.userOffers.length;
        let offerIdAccOne = getInfoAccOne.userOffers[offersAccOneLength - 1];

        expectEvent(firstReceipt, "MakeOffer", {
            user: accountOne,
            lotID: new BN(lotId),
            offerID: offerIdAccOne,
            tokenAddress: ERC20Address,
            tokenAmount: tokensAmount,
            itemLotIds: accOneExchangeNFTindexes,
            tokenValue: new BN(0)
        });

        let secondReceipt = await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountThree });

        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });      
        let offersAccThreeLength = getInfoAccThree.userOffers.length;
        let offerIdAccThree = getInfoAccThree.userOffers[offersAccThreeLength - 1];

        expectEvent(secondReceipt, "MakeOffer", {
            user: accountThree,
            lotID: new BN(lotId),
            offerID: offerIdAccThree,
            tokenAddress: ERC20Address,
            tokenAmount: tokensAmount,
            itemLotIds: accThreeExchangeNFTindexes,
            tokenValue: new BN(0)
        });

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
            accOneLotsIds.push(new BN(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(new BN(getInfoAccThree.userLots[i]));
        }

        let lotId = accTwoLotsIds[2];

        let accOneExchangeNFTindexes = accOneLotsIds.slice(2, 5); // [2, 3, 4]
        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(3, 4); // [3]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(50).mul(tokenbits);

        let firstReceipt = await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });      
        let offersAccOneLength = getInfoAccOne.userOffers.length;
        let offerIdAccOne = getInfoAccOne.userOffers[offersAccOneLength - 1];

        expectEvent(firstReceipt, "MakeOffer", {
            user: accountOne,
            lotID: new BN(lotId),
            offerID: offerIdAccOne,
            tokenAddress: ERC20Address,
            tokenAmount: tokensAmount,
            itemLotIds: accOneExchangeNFTindexes,
            tokenValue: new BN(0)
        });

        let secondReceipt = await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, ERC20Address, 
                tokensAmount, { from: accountThree, value: commissionOffer });

        getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });      
        let offersAccThreeLength = getInfoAccThree.userOffers.length;
        let offerIdAccThree = getInfoAccThree.userOffers[offersAccThreeLength - 1];

        expectEvent(secondReceipt, "MakeOffer", {
            user: accountThree,
            lotID: new BN(lotId),
            offerID: offerIdAccThree,
            tokenAddress: ERC20Address,
            tokenAmount: tokensAmount,
            itemLotIds: accThreeExchangeNFTindexes,
            tokenValue: new BN(0)
        });

        let offersAmount = new BN(2);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("check if user who made offer (NFT + tokens) with this NFT cannot put it up for sell", async () => {
        let accOneLotsIds = [];
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(30));

        let openForOffers = true;

        await expectRevert(
            MarketPlace.sell(accOneLotsIds[3], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne }),
            "revert"
        );
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
        let cryptoProposalAmount = new BN(1).mul(tokenbits);

        let firstReceipt = await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: cryptoProposalAmount });

        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });      
        let offersAccOneLength = getInfoAccOne.userOffers.length;
        let offerIdAccOne = getInfoAccOne.userOffers[offersAccOneLength - 1];

        expectEvent(firstReceipt, "MakeOffer", {
            user: accountOne,
            lotID: new BN(lotId),
            offerID: offerIdAccOne,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: tokensAmount,
            itemLotIds: accOneExchangeNFTindexes,
            tokenValue: new BN(cryptoProposalAmount)
        });

        let secondReceipt = await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: cryptoProposalAmount });

        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });      
        let offersAccThreeLength = getInfoAccThree.userOffers.length;
        let offerIdAccThree = getInfoAccThree.userOffers[offersAccThreeLength - 1];

        expectEvent(secondReceipt, "MakeOffer", {
            user: accountThree,
            lotID: new BN(lotId),
            offerID: offerIdAccThree,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: tokensAmount,
            itemLotIds: accThreeExchangeNFTindexes,
            tokenValue: new BN(cryptoProposalAmount)
        });

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
            accOneLotsIds.push(new BN(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(new BN(getInfoAccThree.userLots[i]));
        }

        let lotId = accTwoLotsIds[4];

        let accOneExchangeNFTindexes = accOneLotsIds.slice(5, 6); // [5]
        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(4, 6); // [4, 5]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(6).mul(tokenbits);

        let firstReceipt = await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountOne, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });      
        let offersAccOneLength = getInfoAccOne.userOffers.length;
        let offerIdAccOne = getInfoAccOne.userOffers[offersAccOneLength - 1];

        expectEvent(firstReceipt, "MakeOffer", {
            user: accountOne,
            lotID: new BN(lotId),
            offerID: offerIdAccOne,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: tokensAmount,
            itemLotIds: accOneExchangeNFTindexes,
            tokenValue: new BN(cryptoProposalAmount)
        });

        let secondReceipt = await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            tokensAmount, { from: accountThree, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });

        getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });      
        let offersAccThreeLength = getInfoAccThree.userOffers.length;
        let offerIdAccThree = getInfoAccThree.userOffers[offersAccThreeLength - 1];

        expectEvent(secondReceipt, "MakeOffer", {
            user: accountThree,
            lotID: new BN(lotId),
            offerID: offerIdAccThree,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: tokensAmount,
            itemLotIds: accThreeExchangeNFTindexes,
            tokenValue: new BN(cryptoProposalAmount)
        });

        let offersAmount = new BN(2);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("check if user who made offer (NFT + crypto) with this NFT cannot put it up for sell", async () => {
        let accOneLotsIds = [];
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(30));

        let openForOffers = false;

        await expectRevert(
            MarketPlace.sell(accOneLotsIds[5], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne }),
            "revert"
        );
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
            accOneLotsIds.push(new BN(getInfoAccOne.userLots[i]));
        }

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
        }

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(new BN(getInfoAccThree.userLots[i]));
        }

        let lotId = accTwoLotsIds[7];

        let accOneExchangeNFTindexes = accOneLotsIds.slice(7, 8); // [7]
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(150).mul(tokenbits);

        // accountOne make offer NFT + tokens
        let firstReceipt = await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, 
            tokensAmount, { from: accountOne, value: commissionOffer });

        getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });      
        let offersAccOneLength = getInfoAccOne.userOffers.length;
        let offerIdAccOne = getInfoAccOne.userOffers[offersAccOneLength - 1];

        expectEvent(firstReceipt, "MakeOffer", {
            user: accountOne,
            lotID: new BN(lotId),
            offerID: offerIdAccOne,
            tokenAddress: ERC20Address,
            tokenAmount: tokensAmount,
            itemLotIds: accOneExchangeNFTindexes,
            tokenValue: new BN(0)
        });

        let accThreeExchangeNFTindexes = accThreeLotsIds.slice(6, 10); // [6, 7, 8, 9]
        let accThreeTokensAmount = new BN(0);  

        // accountThree make offer NFT
        let secondReceipt = await MarketPlace.makeOffer(lotId, accThreeExchangeNFTindexes, constants.ZERO_ADDRESS, 
            accThreeTokensAmount, { from: accountThree, value: commissionOffer });

        getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });      
        let offersAccThreeLength = getInfoAccThree.userOffers.length;
        let offerIdAccThree = getInfoAccThree.userOffers[offersAccThreeLength - 1];

        expectEvent(secondReceipt, "MakeOffer", {
            user: accountThree,
            lotID: new BN(lotId),
            offerID: offerIdAccThree,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: accThreeTokensAmount,
            itemLotIds: accThreeExchangeNFTindexes,
            tokenValue: new BN(0)
        });

        let accFourExchangeNFTindexes = [];
        let accFourTokensAmount = new BN(0);  
        let cryptoProposalAmount = new BN(15).mul(tokenbits); 

        // accountFour make offer crypto
        let thirdReceipt = await MarketPlace.makeOffer(lotId, accFourExchangeNFTindexes, constants.ZERO_ADDRESS, 
            accFourTokensAmount, { from: accountFour, value: cryptoProposalAmount });  // check offers

        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });      
        let offersAccFourLength = getInfoAccFour.userOffers.length;
        let offerIdAccFour = getInfoAccFour.userOffers[offersAccFourLength - 1];

        expectEvent(thirdReceipt, "MakeOffer", {
            user: accountFour,
            lotID: new BN(lotId),
            offerID: offerIdAccFour,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: accFourTokensAmount,
            itemLotIds: accFourExchangeNFTindexes,
            tokenValue: new BN(cryptoProposalAmount)
        });

        let offersAmount = new BN(3);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("check if user who made offer (NFT + tokens) with this NFT cannot put it up for sell", async () => {
        let accOneLotsIds = [];
        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfoAccOne.userLots.length; i++) {
            accOneLotsIds.push(Number(getInfoAccOne.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(30));

        let openForOffers = false;

        await expectRevert(
            MarketPlace.sell(accOneLotsIds[7], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne }),
            "revert"
        );
    });

    it("check if user who made offer (NFT) with this NFT cannot put it up for sell", async () => {
        let accThreeLotsIds = [];
        let getInfoAccThree = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfoAccThree.userLots.length; i++) {
            accThreeLotsIds.push(Number(getInfoAccThree.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(30));

        let openForOffers = false;

        await expectRevert(
            MarketPlace.sell(accThreeLotsIds[7], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountThree }),
            "revert"
        );
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

        let receipt = await MarketPlace.NFT_Offer([ERC1155Address], [accFourNFT1155id], [accFourNFT1155value], 
            [isERC1155], lotId, ERC20Address, tokensAmount, NFTdata, { from: accountFour, value: commissionOffer });

        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });
        let lotsLength = getInfoAccFour.userLots.length;
        let itemLotId = getInfoAccFour.userLots[lotsLength - 1];       
        let offersLength = getInfoAccFour.userOffers.length;
        let offerId = getInfoAccFour.userOffers[offersLength - 1];

        expectEvent(receipt, "MakeOffer", {
            user: accountFour,
            lotID: new BN(lotId),
            offerID: offerId,
            tokenAddress: ERC20Address,
            tokenAmount: tokensAmount,
            itemLotIds: [new BN(itemLotId)],
            tokenValue: new BN(0)
        });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountFour });  
        
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

        let receipt = await MarketPlace.NFT_Offer([ERC1155Address], [accFourNFT1155id], [accFourNFT1155value], 
            [isERC1155], lotId, constants.ZERO_ADDRESS, tokensAmount, NFTdata, 
            { from: accountFour, value: (Number(commissionOffer) + Number(cryptoAmount)) });

        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });
        let lotsLength = getInfoAccFour.userLots.length;
        let itemLotId = getInfoAccFour.userLots[lotsLength - 1];       
        let offersLength = getInfoAccFour.userOffers.length;
        let offerId = getInfoAccFour.userOffers[offersLength - 1];

        expectEvent(receipt, "MakeOffer", {
            user: accountFour,
            lotID: new BN(lotId),
            offerID: offerId,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: tokensAmount,
            itemLotIds: [new BN(itemLotId)],
            tokenValue: new BN(cryptoAmount)
        });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountFour });  
        
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

        let receipt = await MarketPlace.NFT_Offer([ERC721Address], [accFourNFT721ids[0]], [value], 
            [isERC1155], lotId, ERC20Address, tokensAmount, NFTdata, { from: accountFour, value: commissionOffer });

        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });
        let lotsLength = getInfoAccFour.userLots.length;
        let itemLotId = getInfoAccFour.userLots[lotsLength - 1];       
        let offersLength = getInfoAccFour.userOffers.length;
        let offerId = getInfoAccFour.userOffers[offersLength - 1];

        expectEvent(receipt, "MakeOffer", {
            user: accountFour,
            lotID: new BN(lotId),
            offerID: offerId,
            tokenAddress: ERC20Address,
            tokenAmount: tokensAmount,
            itemLotIds: [new BN(itemLotId)],
            tokenValue: new BN(0)
        });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountFour });  
        
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

        let receipt = await MarketPlace.NFT_Offer([ERC721Address], [accFourNFT721ids[1]], [value], 
            [isERC1155], lotId, constants.ZERO_ADDRESS, tokensAmount, NFTdata, 
            { from: accountFour, value: (Number(commissionOffer) + Number(cryptoAmount)) });

        let getInfoAccFour = await MarketPlace.getInfo(accountFour, { from: accountFour });
        let lotsLength = getInfoAccFour.userLots.length;
        let itemLotId = getInfoAccFour.userLots[lotsLength - 1];       
        let offersLength = getInfoAccFour.userOffers.length;
        let offerId = getInfoAccFour.userOffers[offersLength - 1];

        expectEvent(receipt, "MakeOffer", {
            user: accountFour,
            lotID: new BN(lotId),
            offerID: offerId,
            tokenAddress: constants.ZERO_ADDRESS,
            tokenAmount: tokensAmount,
            itemLotIds: [new BN(itemLotId)],
            tokenValue: new BN(cryptoAmount)
        });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountFour });  
        
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

        let lotId = (await MarketPlace.offers(lotOffers[0])).lotID;

        let receipt = await MarketPlace.cancelOffer(lotOffers[0], { from: accountOne });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "RevertedOffer", {
        //     lotID: new BN(lotId),
        //     offerID: new BN(lotOffers[0]),
        //     datetime: new BN(date)
        // });

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

        let lotId = (await MarketPlace.offers(lotOffers[1])).lotID;

        let receipt = await MarketPlace.cancelOffer(lotOffers[1], { from: accountOne });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "RevertedOffer", {
        //     lotID: new BN(lotId),
        //     offerID: new BN(lotOffers[1]),
        //     datetime: new BN(date)
        // });

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

        let lotId = (await MarketPlace.offers(lotOffers[2])).lotID;

        let receipt = await MarketPlace.cancelOffer(lotOffers[2], { from: accountOne });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "RevertedOffer", {
        //     lotID: new BN(lotId),
        //     offerID: new BN(lotOffers[2]),
        //     datetime: new BN(date)
        // });

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

        let cryptoProposalAmount = new BN(1); // from "make offer with cryptocurrancy"
        
        let accOneCryptoBalanceBefore = (await web3.eth.getBalance(accountOne) / tokenbits).toFixed(0);

        let lotId = (await MarketPlace.offers(lotOffers[3])).lotID;

        let receipt = await MarketPlace.cancelOffer(lotOffers[3], { from: accountOne });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "RevertedOffer", {
        //     lotID: new BN(lotId),
        //     offerID: new BN(lotOffers[3]),
        //     datetime: new BN(date)
        // });

        let accOneCryptoBalanceAfter = (await web3.eth.getBalance(accountOne) / tokenbits).toFixed(0);

        assert.equal(new BN(accOneCryptoBalanceBefore).add(cryptoProposalAmount), accOneCryptoBalanceAfter, 
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

        let lotId = (await MarketPlace.offers(lotOffers[4])).lotID;

        let receipt = await MarketPlace.cancelOffer(lotOffers[4], { from: accountOne });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "RevertedOffer", {
        //     lotID: new BN(lotId),
        //     offerID: new BN(lotOffers[4]),
        //     datetime: new BN(date)
        // });

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
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
        }

        let offeredNFTAmount = new BN(45); // from "make offer with NFT" [0, 1, 2]
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal
        let lotId = accTwoLotsIds[0];

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });
   
        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "ChoosedOffer", {
        //     lotID: lotId,
        //     offerID: lotOffers[1],
        //     datetime: new BN(date)
        // });

        let accThreeNFTBalance = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accTwoNFTBalance = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo });
        assert.equal(Number(accThreeNFTBalance), proposalNFTAmount, "accountTree NFT balance is wrong");
        assert.equal(Number(accTwoNFTBalance), offeredNFTAmount, "accountTwo NFT balance is wrong");
    });

    it("choose offer with tokens", async () => {
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);
        let lotId = accTwoLotsIds[1];
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal
        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });
        let accTwoTokensBalanceBefore = await ERC20.balanceOf(accountTwo, { from: accountTwo });
        let receivedMarketCommission = await AdminContract.marketCommission({ from: accountTwo });

        let expectedTokensProfit = tokensAmount - ((tokensAmount.mul(receivedMarketCommission)).div(new BN(1000)));

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "ChoosedOffer", {
        //     lotID: lotId,
        //     offerID: lotOffers[1],
        //     datetime: new BN(date)
        // });

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
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
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
        let receivedMarketCommission = await AdminContract.marketCommission({ from: accountTwo });

        let expectedTokensProfit = tokensAmount - ((tokensAmount.mul(receivedMarketCommission)).div(new BN(1000)));

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "ChoosedOffer", {
        //     lotID: lotId,
        //     offerID: lotOffers[1],
        //     datetime: new BN(date)
        // });
       
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
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[3];
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        let cryptoProposalAmount = new BN(1).mul(tokenbits);
        let receivedCommission = await AdminContract.marketCommission({ from: accountTwo });
        
        let accTwoCryptoBalanceBefore = (await web3.eth.getBalance(accountTwo));
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "ChoosedOffer", {
        //     lotID: lotId,
        //     offerID: lotOffers[1],
        //     datetime: new BN(date)
        // });

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
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
        }

        let lotId = accTwoLotsIds[4];
        let proposalNFTAmount = new BN(1); // sell NFT with zero price for proposal
        let offeredNFTAmount = new BN(30); // from "make offer with NFT + cryptocurrancy" [4, 5]

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        let cryptoProposalAmount = new BN(6).mul(tokenbits);
        let receivedCommission = await AdminContract.marketCommission({ from: accountTwo });

        let accTwoCryptoBalanceBefore = (await web3.eth.getBalance(accountTwo));
        let accTwoNFTBalanceBefore = await ERC1155.balanceOf(accountTwo, accThreeNFT1155id, { from: accountTwo }); 
        let accThreeNFTBalanceBefore = await ERC721.balanceOf(accountThree, { from: accountThree });

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "ChoosedOffer", {
        //     lotID: lotId,
        //     offerID: lotOffers[1],
        //     datetime: new BN(date)
        // });

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

    

    it("check return of unselected offers", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let getInfoAccTwo = await MarketPlace.getInfo(accountTwo, { from: accountTwo });

        let accTwoLotsIds = [];      

        for(let i = 0; i < getInfoAccTwo.userLots.length; i++) {
            accTwoLotsIds.push(new BN(getInfoAccTwo.userLots[i]));
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

        let canceledLotId = (await MarketPlace.offers(lotOffers[0])).lotID;

        let chooseOfferReceipt = await MarketPlace.chooseOffer(lotId, lotOffers[1], NFTdata, { from: accountTwo });
        let date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(chooseOfferReceipt, "ChoosedOffer", {
        //     lotID: lotId,
        //     offerID: lotOffers[1],
        //     datetime: new BN(date)
        // });

        let receipt = await MarketPlace.cancelOffer(lotOffers[0], { from: accountOne });
        date = (await web3.eth.getBlock("latest")).timestamp;

        // expectEvent(receipt, "RevertedOffer", {
        //     lotID: new BN(canceledLotId),
        //     offerID: new BN(lotOffers[0]),
        //     datetime: new BN(date)
        // });
        
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

        let firstReceipt = await MarketPlace.makeOffer(lotId, accOneExchangeNFTindexes, ERC20Address, tokensAmount, { from: accountOne });

        let getInfoAccOne = await MarketPlace.getInfo(accountOne, { from: accountOne });      
        let offersAccOneLength = getInfoAccOne.userOffers.length;
        let offerIdAccOne = getInfoAccOne.userOffers[offersAccOneLength - 1];

        expectEvent(firstReceipt, "MakeOffer", {
            user: accountOne,
            lotID: new BN(lotId),
            offerID: offerIdAccOne,
            tokenAddress: ERC20Address,
            tokenAmount: tokensAmount,
            itemLotIds: accOneExchangeNFTindexes,
            tokenValue: new BN(0)
        });

        let accTwoNFTBalanceBefore = await ERC721.balanceOf(accountTwo, { from: accountTwo });
        let receipt = await MarketPlace.getBack(lotId, NFTdata, { from: accountTwo });
        let date = (await web3.eth.getBlock("latest")).timestamp;
        let lotInfo = await MarketPlace.lots(lotId, { from: accountTwo });

        // expectEvent(receipt, "GetBack", {
        //     lotID: new BN(lotId),
        //     datetime: new BN(date),
        //     amount: lotInfo.creationInfo.amount
        // });

        let accTwoNFTBalanceAfter = await ERC721.balanceOf(accountTwo, { from: accountTwo });

        assert.equal(String(accTwoNFTBalanceAfter), accTwoNFTBalanceBefore.add(new BN(1)), "owner didn't return NFT back");
    });
})