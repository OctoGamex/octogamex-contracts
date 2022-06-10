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

contract("sell NFT functionality", async accounts => {
    const [deployer, accountOne, accountTwo, accountThree] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace;
    let ERC1155Address, ERC721Address, ERC20Address, MarketPlaceAddress;
    
    const NFT1155id = new BN(1);
    const accThreeNFT1155id = new BN(2);
    const threeNFT1155id = new BN(3);

    const NFT721id = new BN(1); 
    
    let addNFT721Num = new BN(13);
    let accThreeNFT721ids = [];
    let threeNFT721id = new BN(50);

    const NFTdata = 0; 

    let commissionOffer;

    before(async () => {
        ERC1155 = await NFT1155.new({from: deployer});
        ERC721 = await NFT721.new({from: deployer});
        ERC20 = await Tokens.new({from: deployer});

        ERC1155Address = ERC1155.address;
        ERC721Address = ERC721.address;
        ERC20Address = ERC20.address;

        MarketPlace = await Marketplace.deployed({from: deployer});
        MarketPlaceAddress = MarketPlace.address;

        let isERC20Supported = true;
        await MarketPlace.setERC20_Support(ERC1155Address, [ERC20Address], [isERC20Supported], { from: deployer });
        await MarketPlace.setERC20_Support(ERC721Address, [ERC20Address], [isERC20Supported], { from: deployer });

        let canTransfer = true;
        await MarketPlace.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });
    });

    it("reset market commission", async () => {
        let marketCommission = new BN(150);

        await MarketPlace.setMarketCommission(marketCommission, {from: deployer});

        let receivedMarketCommission = await MarketPlace.marketCommission({from: deployer});
        assert.equal(Number(receivedMarketCommission), marketCommission, "market comission is wrong");
    });

    it("expect revert if market commission more then 100%", async () => {
        let marketCommission = new BN(1001);

        await expectRevert(
            MarketPlace.setMarketCommission(marketCommission, {from: deployer}),
            "revert"
        );
    });

    it("expect revert for NOT owner caller func 'setMarketCommission'", async () => {
        let marketCommission = new BN(150);

        await expectRevert(
            MarketPlace.setMarketCommission(marketCommission, {from: accountOne}),
            "19"
        );
    });

    it("reset offer commission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(16));
        commissionOffer = new BN(5).mul(tokenbits);

        await MarketPlace.setOfferCommission(commissionOffer, {from: deployer});

        let receivedOfferCommission = await MarketPlace.offerCommission({from: deployer});
        assert.equal(Number(receivedOfferCommission), commissionOffer, "offer comission is wrong");
    });

    it("expect revert for NOT owner caller func 'setOfferCommission'", async () => {
        const tokenbits = (new BN(10)).pow(new BN(16));
        let offerCommission = new BN(5).mul(tokenbits);

        await expectRevert(
            MarketPlace.setOfferCommission(offerCommission, {from: accountOne}),
            "19"
        );
    });

    it("reset market wallet", async () => {
        await MarketPlace.setWallet(deployer, {from: deployer});

        let receivedMarketWallet = await MarketPlace.marketWallet({from: deployer});
        assert.equal(String(receivedMarketWallet), deployer, "market wallet is wrong");
    });

    it("expect revert for NOT owner caller func 'marketWallet'", async () => {
        await expectRevert(
            MarketPlace.setWallet(deployer, {from: accountOne}),
            "Ownable: caller is not the owner"
        );
    });

    it("expect revert if market wallet equal zero adress", async () => {
        await expectRevert(
            MarketPlace.setWallet(constants.ZERO_ADDRESS, {from: deployer}),
            "revert"
        );
    });

    it("expect revert if market wallet equal to itself", async () => {
        let oldMarketWallet = await MarketPlace.marketWallet({from: deployer});

        await expectRevert(
            MarketPlace.setWallet(oldMarketWallet, {from: deployer}),
            "revert"
        );
    });

    it("mint & approve NFT and tokens for users", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let accOneTokensAmount = new BN(1000).mul(tokenbits);

        const NFT1155amount = new BN(100);
        const NFTapproved = true;

        await ERC1155.mint(accountOne, NFT1155id, NFT1155amount, NFTdata, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        await ERC1155.mint(accountThree, accThreeNFT1155id, NFT1155amount, NFTdata, { from: accountThree });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountThree });

        await ERC721.mint(accountOne, NFT721id, { from: accountOne });
        await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        let j = 0;
        for(let i = 10; i < addNFT721Num; i++) {
            accThreeNFT721ids.push(new BN(i));
            await ERC721.mint(accountThree, accThreeNFT721ids[j], { from: accountThree });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountThree });
            j++;
        }

        await ERC20.mint(accountTwo, accOneTokensAmount, { from: accountTwo });
        await ERC20.approve(MarketPlaceAddress, accOneTokensAmount, { from: accountTwo });

        await ERC1155.mint(accountThree, threeNFT1155id, NFT1155amount, NFTdata, { from: accountThree });
        await ERC721.mint(accountThree, threeNFT721id, { from: accountThree });
    });

    it("user should be able to add NFT ERC-1155", async () => {
        let accOneBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, NFT1155id, { from: accountOne });

        let NFT1155value = new BN(10);
        let isERC1155 = true;
        let addNFTNum = 8; // max 10
        let lotType = 0; // lotType.None

        let receipt;
        let date;
        for(let i = 0; i < addNFTNum; i++) {           
            receipt = await MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne });
            date = (await web3.eth.getBlock("latest")).timestamp;

            expectEvent(receipt, 'AddNFT', {
                user: accountOne,
                contractAddress: ERC1155Address,
                NFT_ID: NFT1155id,
                lotID: new BN(i),
                datetime: new BN(date),
                amount: NFT1155value,
                typeOfLot: new BN(lotType)
            });
        }     

        let accOneBalanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, NFT1155id, { from: accountOne });

        assert.notEqual(accOneBalanceBeforeTransfer, accOneBalanceAfterTransfer, "before add NFT-1155 to Market Place and after should not be equal");
        assert.equal(Number(accOneBalanceAfterTransfer), (Number(NFT1155value) * addNFTNum), "after add NFT-1155 to Market Place amount is wrong");
    });

    it("user should be able to add NFT ERC-721", async () => {
        let accOneBalanceBeforeTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });
        let NFT721value = new BN(1);
        let isERC1155 = false;
        let lotType = 0; // lotType.None
        
        let receipt = await MarketPlace.add(ERC721Address, NFT721id, NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });
        let date = (await web3.eth.getBlock("latest")).timestamp;
        
        expectEvent(receipt, 'AddNFT', {
            user: accountOne,
            contractAddress: ERC721Address,
            NFT_ID: NFT721id,
            lotID: new BN(8),
            datetime: new BN(date),
            amount: NFT721value,
            typeOfLot: new BN(lotType)
        });

        let accOneBalanceAfterTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });

        assert.notEqual(accOneBalanceBeforeTransfer, accOneBalanceAfterTransfer, "before add NFT-721 to Market Place and after should not be equal");
        assert.equal(Number(accOneBalanceAfterTransfer), Number(NFT721value), "after add NFT-721 to Market Place amount is wrong");
    });

    it("'contractAddress' in func 'add' should not be able zero address", async () => {
        let NFT1155value = new BN(10);
        let isERC1155 = false;
        let lotType = 0; // lotType.None

        await expectRevert(
            MarketPlace.add(constants.ZERO_ADDRESS, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne }),
            'revert'
        );
    });

    it("'value' in func 'add' should not be able zero param", async () => {
        let NFT1155value = new BN(0);
        let isERC1155 = true;
        let lotType = 0; // lotType.None

        await expectRevert(
            MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne }),
            'revert'
        );
    }); 
    
    it("expect rever if sell start date more than a month", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(100)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let thirtytwoDays = 32 * 24 * 3600;
        let lotStartDate = (new BN(date.timestamp)).add(new BN(thirtytwoDays));

        let openForOffers = false;

        await expectRevert(
            MarketPlace.sell(userLotsIds[0], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne }),
            "revert"
        );
    });

    it("sell NFT for cryptocurrency with zero address", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(10)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        // console.log(date.timestamp);
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));

        let openForOffers = false;

        await MarketPlace.sell(userLotsIds[0], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[0], { from: accountOne });
        assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
    });

    it("sell NFT for tokens (ERC-20)", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(200)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));

        let openForOffers = false;

        await MarketPlace.sell(userLotsIds[1], ERC20Address, lotPrice, openForOffers, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[1], { from: accountOne });
        assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
    });

    it("should not sell NFT with param 'contractAddress' equal ERC-1155", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let lotStartDate = Math.floor(Date.now() / 1000);

        let openForOffers = false;

        await expectRevert(
            MarketPlace.sell(userLotsIds[2], ERC1155Address, lotPrice, openForOffers, lotStartDate, { from: accountOne }),
            "revert"
        );
    });

    it("should not sell one NFT twice", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));

        let openForOffers = false;

        await MarketPlace.sell(userLotsIds[3], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne });

        await expectRevert(
            MarketPlace.sell(userLotsIds[3], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne }),
            "revert"
        ); 
    });

    it("sell NFT with zero price for cryptocurrency", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(0));
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));

        let openForOffers = false;

        await MarketPlace.sell(userLotsIds[4], constants.ZERO_ADDRESS, lotPrice, openForOffers, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[4], { from: accountOne });
        assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
    });

    it("sell NFT with zero price for tokens (ERC-20)", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(0));
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));

        let openForOffers = false;

        await MarketPlace.sell(userLotsIds[5], ERC20Address, lotPrice, openForOffers, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[5], { from: accountOne });
        assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
    });

    it("sell NFT with zero price for tokens (ERC-20)", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let oneDay = 1 * 24 * 3600;
        let lotStartDate = (new BN(date.timestamp)).add(new BN(oneDay));

        let openForOffers = false;

        await MarketPlace.sell(userLotsIds[6], ERC20Address, lotPrice, openForOffers, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[6], { from: accountOne });
        assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
    });

    it("get NFT back", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        await MarketPlace.getBack(userLotsIds[7], NFTdata, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[7], { from: accountOne });

        assert.equal(lotInfo.creationInfo.owner, constants.ZERO_ADDRESS, "NFT owner didn'n get back NFT (creationInfo.owner)");
        assert.equal(lotInfo.creationInfo.amount, 0, "NFT owner didn'n get back NFT (creationInfo.amount)");
    });

    it("expect revert if make offer on lot not for proposals", async () => {
        await time.increase(time.duration.minutes(1));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(100).mul(tokenbits);
        let exchangeNFTindexes = [];

        await expectRevert(
            MarketPlace.makeOffer(userLotsIds[0], exchangeNFTindexes, constants.ZERO_ADDRESS, 
                tokensAmount, { from: accountThree, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) }),
                "12" //
        );
    });
    
    it("buy NFT for cryptocurrency", async () => {
        await time.increase(time.duration.minutes(1));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(10)).mul(tokenbits);

        let lotInfo = await MarketPlace.lots(userLotsIds[0], { from: accountTwo });
        let accTwoNFTBalanceBefore = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));

        let commission = await MarketPlace.marketCommission({ from: deployer });

        let commisionWalletBalanceBefore = await web3.eth.getBalance(deployer);
        console.log("commission wallet crypto balance before", commisionWalletBalanceBefore / tokenbits);

        let receipt = await MarketPlace.buy(userLotsIds[0], NFTdata, { from: accountTwo, value: lotPrice });

        let commisionWalletBalanceAfter = await web3.eth.getBalance(deployer);
        console.log("commission wallet crypto balance after", commisionWalletBalanceAfter / tokenbits);
        
        console.log("gas used for 1st lot: ", receipt.receipt.gasUsed);

        let accTwoNFTBalanceAfter = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));

        let expectedCommision = (lotPrice.mul(commission)).div(new BN(1000));

        assert.equal((new BN(commisionWalletBalanceBefore)).add(expectedCommision), commisionWalletBalanceAfter, 
            "crypto commission amount on commission wallet is wrong");

        assert.equal((accTwoNFTBalanceBefore + Number(lotInfo.creationInfo.amount)), accTwoNFTBalanceAfter, 
            "NFT was not bought");
    });

    it("buy NFT for tokens (ERC-20)", async () => {
        await time.increase(time.duration.minutes(5));
        const tokenbits = (new BN(10)).pow(new BN(18));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(200)).mul(tokenbits);

        let lotInfo = await MarketPlace.lots(userLotsIds[1], { from: accountTwo });
        let accTwoNFTBalanceBefore = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));
        let accTwoTokensBalBefore = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        let commisionWalletBalanceBefore = await ERC20.balanceOf.call(deployer, { from: deployer });
        console.log("commission wallet token balance before", Number(commisionWalletBalanceBefore));

        await MarketPlace.buy(userLotsIds[1], NFTdata, { from: accountTwo });

        let accTwoNFTBalanceAfter = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));
        let accTwoTokensBalAfter = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        let commisionWalletBalanceAfter = await ERC20.balanceOf.call(deployer, { from: deployer });       
        console.log("commission wallet token balance before", Number(commisionWalletBalanceAfter) / tokenbits);

        let commission = await MarketPlace.marketCommission({ from: deployer });
        let expectedCommision = (lotPrice.mul(commission)).div(new BN(1000));

        assert.equal((new BN(commisionWalletBalanceBefore)).add(expectedCommision), String(commisionWalletBalanceAfter), 
            "token commission amount on commission wallet is wrong");

        assert.equal((accTwoNFTBalanceBefore + Number(lotInfo.creationInfo.amount)), accTwoNFTBalanceAfter, 
            "NFT was not bought");

        assert.equal((accTwoTokensBalBefore - Number(lotInfo.price.buyerPrice)), accTwoTokensBalAfter, 
            "tokens has not been withdrawn from buyer's balance");   
    });

    it("user can not buy the same NFT twice", async () => {
        await time.increase(time.duration.minutes(3));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);

        let lotInfo = await MarketPlace.lots(userLotsIds[3], { from: accountTwo });

        let accTwoNFTBalanceBefore = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));

        let receipt = await MarketPlace.buy(userLotsIds[3], NFTdata, { from: accountTwo, value: lotPrice });
        console.log("gas used for last lot: ", receipt.receipt.gasUsed);

        let accTwoNFTBalanceAfter = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));

        assert.equal((accTwoNFTBalanceBefore + Number(lotInfo.creationInfo.amount)), accTwoNFTBalanceAfter, 
            "NFT was not bought");

        await expectRevert(
            MarketPlace.buy(userLotsIds[3], NFTdata, { from: accountTwo, value: lotPrice }),
            "revert"
        );      
    });

    it("user can not buy NFT with zero price for cryptocurrency", async () => {
        await time.increase(time.duration.minutes(1));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = new BN(0);

        await expectRevert(
            MarketPlace.buy(userLotsIds[4], NFTdata, { from: accountTwo, value: lotPrice }),
            "revert"
        );      
    });

    it("user can not buy NFT with zero price for tokens (ERC-20)", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        await expectRevert(
            MarketPlace.buy(userLotsIds[5], NFTdata, { from: accountTwo }),
            "revert"
        );      
    });

    it("user can not buy NFT if the sale time has not started yet", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        await expectRevert(
            MarketPlace.buy(userLotsIds[6], NFTdata, { from: accountTwo }),
            "revert"
        );
    });

    it("user can not buy NFT if it is not selling", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        await expectRevert(
            MarketPlace.buy(userLotsIds[8], NFTdata, { from: accountTwo }),
            "revert"
        );
    });

    it("check 'NFT_Sale' functionality with NFT-1155 for tokens", async () => {       
        let value = new BN(25);
        let isERC1155 = true;
        let date = await web3.eth.getBlock("latest");
        let startDate = (new BN(date.timestamp)).add(new BN(5));

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);

        let openForOffers = false;

        await MarketPlace.NFT_Sale(ERC1155Address, threeNFT1155id, value, 
            isERC1155, startDate, ERC20Address, tokensAmount, openForOffers, NFTdata, { from: accountThree });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountThree });
        
        assert.equal(lotInfo.creationInfo.owner, accountThree, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC1155Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, value, "NFT amount is wrong");

        let commission = await MarketPlace.marketCommission({ from: deployer });
        let expectedReward = tokensAmount.sub((tokensAmount.mul(commission)).div(new BN(1000)));
        
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "tokens address is wrong");
        assert.equal(lotInfo.price.sellerPrice, expectedReward, "seller price is wrong");
        assert.equal(lotInfo.price.buyerPrice, tokensAmount, "tokens amount is wrong");
    });

    it("check 'NFT_Sale' functionality with NFT-1155 for crypto", async () => {
        let value = new BN(25);
        let isERC1155 = true;
        let date = await web3.eth.getBlock("latest");
        let startDate = (new BN(date.timestamp)).add(new BN(5));

        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(2).mul(tokenbits);

        let openForOffers = false;

        await MarketPlace.NFT_Sale(ERC1155Address, accThreeNFT1155id, value, 
            isERC1155, startDate, constants.ZERO_ADDRESS, cryptoAmount, openForOffers, NFTdata, { from: accountThree });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountThree });
        
        assert.equal(lotInfo.creationInfo.owner, accountThree, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC1155Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, value, "NFT amount is wrong");

        let commission = await MarketPlace.marketCommission({ from: deployer });
        let expectedReward = cryptoAmount.sub((cryptoAmount.mul(commission)).div(new BN(1000)));
        
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "tokens address is wrong");
        assert.equal(lotInfo.price.sellerPrice, expectedReward, "seller price is wrong");
        assert.equal(lotInfo.price.buyerPrice, cryptoAmount, "crypto amount is wrong");
    });

    it("check 'NFT_Sale' functionality with NFT-1155 for tokens exchange", async () => {       
        let value = new BN(25);
        let isERC1155 = true;
        let date = await web3.eth.getBlock("latest");
        let startDate = (new BN(date.timestamp)).add(new BN(5));

        let tokensAmount = new BN(0);

        let openForOffers = false;

        await MarketPlace.NFT_Sale(ERC1155Address, accThreeNFT1155id, value, 
            isERC1155, startDate, ERC20Address, tokensAmount, openForOffers, NFTdata, { from: accountThree });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountThree });
        
        assert.equal(lotInfo.creationInfo.owner, accountThree, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC1155Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, value, "NFT amount is wrong");
        
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "tokens address is wrong");
        assert.equal(lotInfo.price.sellerPrice, tokensAmount, "seller price is wrong");
        assert.equal(lotInfo.price.buyerPrice, tokensAmount, "tokens amount is wrong");
    });

    it("check 'NFT_Sale' functionality with NFT-721 for tokens", async () => {
        let value = new BN(1);
        let isERC1155 = false;
        let date = await web3.eth.getBlock("latest");
        let startDate = (new BN(date.timestamp)).add(new BN(5));

        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(200).mul(tokenbits);

        let openForOffers = false;

        await MarketPlace.NFT_Sale(ERC721Address, threeNFT721id, value, 
            isERC1155, startDate, ERC20Address, tokensAmount, openForOffers, NFTdata, { from: accountThree });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountThree });
        
        assert.equal(lotInfo.creationInfo.owner, accountThree, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC721Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, value, "NFT amount is wrong");

        let commission = await MarketPlace.marketCommission({ from: deployer });
        let expectedReward = tokensAmount.sub((tokensAmount.mul(commission)).div(new BN(1000)));
        
        assert.equal(lotInfo.price.contractAddress, ERC20Address, "tokens address is wrong");
        assert.equal(lotInfo.price.sellerPrice, expectedReward, "seller price is wrong");
        assert.equal(lotInfo.price.buyerPrice, tokensAmount, "tokens amount is wrong");
    });

    it("reset market commission", async () => {
        let marketCommission = new BN(0);

        await MarketPlace.setMarketCommission(marketCommission, {from: deployer});

        let receivedMarketCommission = await MarketPlace.marketCommission({from: deployer});
        assert.equal(Number(receivedMarketCommission), marketCommission, "market comission is wrong");
    });

    it("check 'NFT_Sale' functionality with NFT-721 for crypto", async () => {
        let value = new BN(1);
        let isERC1155 = false;
        let date = await web3.eth.getBlock("latest");
        let startDate = (new BN(date.timestamp)).add(new BN(5));

        const tokenbits = (new BN(10)).pow(new BN(18));
        let cryptoAmount = new BN(2).mul(tokenbits);

        let openForOffers = false;

        await MarketPlace.NFT_Sale(ERC721Address, accThreeNFT721ids[1], value, 
            isERC1155, startDate, constants.ZERO_ADDRESS, cryptoAmount, openForOffers, NFTdata, { from: accountThree });

        let lotLength = await MarketPlace.getLotsLength();
        let lotInfo = await MarketPlace.lots(lotLength - 1, { from: accountThree });
        
        assert.equal(lotInfo.creationInfo.owner, accountThree, "lot owner is wrong");
        assert.equal(lotInfo.creationInfo.contractAddress, ERC721Address, "lot NFT contract address is wrong");
        assert.equal(lotInfo.creationInfo.amount, value, "NFT amount is wrong");

        let commission = await MarketPlace.marketCommission({ from: deployer });
        let expectedReward = cryptoAmount.sub((cryptoAmount.mul(commission)).div(new BN(1000)));
        
        assert.equal(lotInfo.price.contractAddress, constants.ZERO_ADDRESS, "tokens address is wrong");
        assert.equal(lotInfo.price.sellerPrice, expectedReward, "seller price is wrong");
        assert.equal(lotInfo.price.buyerPrice, cryptoAmount, "crypto amount is wrong");
    });

    it("expect revert if not enought payment", async () => {
        await time.increase(time.duration.minutes(1));
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotId = userLotsIds[userLotsIds.length - 1];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);

        await expectRevert(
            MarketPlace.buy(lotId, NFTdata, { from: accountTwo, value: lotPrice }),
            "11"
        );
    });

    it("buy NFT with zero market commission", async () => {
        await time.increase(time.duration.minutes(1));
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountThree, { from: accountThree });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotId = userLotsIds[userLotsIds.length - 1];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(2)).mul(tokenbits);

        console.log(Number(await MarketPlace.marketCommission({ from: deployer })));
        await MarketPlace.buy(lotId, NFTdata, { from: accountTwo, value: lotPrice });
    });

    it("check add NFT-1155 without smart-contract", async () => {
        let value = new BN(25);

        await expectRevert( 
            ERC1155.safeTransferFrom(accountThree, MarketPlaceAddress, accThreeNFT1155id, value, NFTdata, { from: accountThree }),
            "revert"
        );
    });

    it("check add NFT-721 without smart-contract", async () => {
        await expectRevert( 
            ERC721.safeTransferFrom(accountThree, MarketPlaceAddress, accThreeNFT721ids[2], { from: accountThree }),
            "revert"
        );
    });
})