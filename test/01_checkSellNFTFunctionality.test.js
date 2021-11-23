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
    const [deployer, accountOne, accountTwo] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace;
    let ERC1155Address, ERC721Address, ERC20Address, MarketPlaceAddress;
    
    const NFT1155id = new BN(1);
    const NFT721id = new BN(1);   
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
            "Ownable: caller is not the owner"
        );
    });

    it("reset offer commission", async () => {
        const tokenbits = (new BN(10)).pow(new BN(16));
        let offerCommission = new BN(5).mul(tokenbits);

        await MarketPlace.setOfferCommission(offerCommission, {from: deployer});

        let receivedOfferCommission = await MarketPlace.offerCommission({from: deployer});
        assert.equal(Number(receivedOfferCommission), offerCommission, "offer comission is wrong");
    });

    it("expect revert for NOT owner caller func 'setOfferCommission'", async () => {
        const tokenbits = (new BN(10)).pow(new BN(16));
        let offerCommission = new BN(5).mul(tokenbits);

        await expectRevert(
            MarketPlace.setOfferCommission(offerCommission, {from: accountOne}),
            "Ownable: caller is not the owner"
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
            "Invalid market address"
        );
    });

    it("expect revert if market wallet equal to itself", async () => {
        let oldMarketWallet = await MarketPlace.marketWallet({from: deployer});

        await expectRevert(
            MarketPlace.setWallet(oldMarketWallet, {from: deployer}),
            "Invalid market address"
        );
    });

    it("mint, approve & set NFT collection", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let accOneTokensAmount = new BN(1000).mul(tokenbits);

        const NFT1155amount = new BN(100);
        const NFTapproved = true;

        await ERC1155.mint(accountOne, NFT1155id, NFT1155amount, NFTdata, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        await ERC721.mint(accountOne, NFT721id, { from: accountOne });
        await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        await ERC20.mint(accountTwo, accOneTokensAmount, { from: accountTwo });
        await ERC20.approve(MarketPlaceAddress, accOneTokensAmount, { from: accountTwo });

        let canTransfer = true;

        await MarketPlace.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });
    });

    it("user should be able to add NFT ERC-1155", async () => {
        let accOneBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, NFT1155id, { from: accountOne });

        let NFT1155value = new BN(10);
        let isERC1155 = true;
        let addNFTNum = 8; // max 10
        let lotType = 0; // lotType.None

        for(let i = 0; i < addNFTNum; i++) {
            await MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne });
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

        await MarketPlace.add(ERC721Address, NFT721id, NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });

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
            'Value is 0'
        );
    });

    it("'value' in func 'add' should not be able zero param", async () => {
        let NFT1155value = new BN(0);
        let isERC1155 = true;
        let lotType = 0; // lotType.None

        await expectRevert(
            MarketPlace.add(ERC1155Address, NFT1155id, NFT1155value, isERC1155, lotType, NFTdata, { from: accountOne }),
            'Value is 0'
        );
    });  

    // add tests for a function setERC20_Support
    
    it("set ERC-20 support", async () => {
        let isERC20Supported = true;
        await MarketPlace.setERC20_Support(ERC1155Address, [ERC20Address], [isERC20Supported], { from: deployer });
        await MarketPlace.setERC20_Support(ERC721Address, [ERC20Address], [isERC20Supported], { from: deployer });
    });

    it("sell NFT for cryptocurrency with zero address", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let lotStartDate = Math.floor(Date.now() / 1000);

        await MarketPlace.sell(userLotsIds[0], constants.ZERO_ADDRESS, lotPrice, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[0], { from: accountOne });
        assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");

        // console.log(await MarketPlace.lots(userLotsIds[0], { from: accountOne }));
    });

    it("sell NFT for tokens (ERC-20)", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(200)).mul(tokenbits);
        let lotStartDate = Math.floor(Date.now() / 1000);

        await MarketPlace.sell(userLotsIds[1], ERC20Address, lotPrice, lotStartDate, { from: accountOne });

        let lotInfo = await MarketPlace.lots(userLotsIds[1], { from: accountOne });
        assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");

        // console.log(await MarketPlace.lots(userLotsIds[0], { from: accountOne }));
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

        await expectRevert(
            MarketPlace.sell(userLotsIds[2], ERC1155Address, lotPrice, lotStartDate, { from: accountOne }),
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
        let lotStartDate = Math.floor(Date.now() / 1000);

        await MarketPlace.sell(userLotsIds[3], constants.ZERO_ADDRESS, lotPrice, lotStartDate, { from: accountOne });

        await expectRevert(
            MarketPlace.sell(userLotsIds[3], constants.ZERO_ADDRESS, lotPrice, lotStartDate, { from: accountOne }),
            "revert" // fix revert message
        ); 
    });

    it("sell NFT with zero price for cryptocurrency", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotPrice = (new BN(0));
        let lotStartDate = Math.floor(Date.now() / 1000);

        await MarketPlace.sell(userLotsIds[4], constants.ZERO_ADDRESS, lotPrice, lotStartDate, { from: accountOne });

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
        let lotStartDate = Math.floor(Date.now() / 1000);

        await MarketPlace.sell(userLotsIds[5], ERC20Address, lotPrice, lotStartDate, { from: accountOne });

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
        const date = new Date();
        let lotStartDate = date.setDate(date.getDate() + 1); // Date.now + 1 day

        await MarketPlace.sell(userLotsIds[6], ERC20Address, lotPrice, lotStartDate, { from: accountOne });

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
    
    it("buy NFT for cryptocurrency", async () => {
        await time.increase(time.duration.minutes(1));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);

        let lotInfo = await MarketPlace.lots(userLotsIds[0], { from: accountTwo });
        let accTwoNFTBalanceBefore = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));

        await MarketPlace.buy(userLotsIds[0], NFTdata, { from: accountTwo, value: lotPrice });

        let accTwoNFTBalanceAfter = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));

        assert.equal((accTwoNFTBalanceBefore + Number(lotInfo.creationInfo.amount)), accTwoNFTBalanceAfter, 
            "NFT was not bought");
    });

    it("buy NFT for tokens (ERC-20)", async () => {
        await time.increase(time.duration.minutes(5));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotInfo = await MarketPlace.lots(userLotsIds[1], { from: accountTwo });
        let accTwoNFTBalanceBefore = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));
        let accTwoTokensBalBefore = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        await MarketPlace.buy(userLotsIds[1], NFTdata, { from: accountTwo });

        let accTwoNFTBalanceAfter = Number(await ERC1155.balanceOf.call(accountTwo, NFT1155id, { from: accountTwo }));
        let accTwoTokensBalAfter = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

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

        await MarketPlace.buy(userLotsIds[3], NFTdata, { from: accountTwo, value: lotPrice });

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
            "Not selling or selling not started"
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
            "Not selling or selling not started"
        );
    });
})