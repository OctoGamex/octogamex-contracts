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
    let commissionOffer;
    
    const NFT1155id = new BN(1);
    
    let addNFT721Num = 101;
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

    it("mint, approve & set NFT collection & set auction contract", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(1000).mul(tokenbits);
        const NFTapproved = true;

        for(let i = 0; i < addNFT721Num; i++) {
            NFT721ids.push(new BN(i));
            await ERC721.mint(accountOne, NFT721ids[i], { from: accountOne });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });
        }

        const NFT1155amount = new BN(1000);
        
        await ERC1155.mint(accountOne, NFT1155id, NFT1155amount, NFTdata, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        await ERC20.mint(accountTwo, tokensAmount, { from: accountTwo });
        await ERC20.approve(MarketPlaceAddress, tokensAmount, { from: accountTwo });

        await ERC20.mint(accountThree, tokensAmount, { from: accountThree });
        await ERC20.approve(MarketPlaceAddress, tokensAmount, { from: accountThree });

        let canTransfer = true;

        await MarketPlace.setNFT_Collection(ERC1155Address, canTransfer, { from: deployer });
        await MarketPlace.setNFT_Collection(ERC721Address, canTransfer, { from: deployer });       
    });

    it("set ERC-20 support", async () => {
        let isERC20Supported = true;
        await MarketPlace.setERC20_Support(ERC1155Address, [ERC20Address], [isERC20Supported], { from: deployer });
        await MarketPlace.setERC20_Support(ERC721Address, [ERC20Address], [isERC20Supported], { from: deployer });
    });

    it("user should be able to add NFT ERC-721", async () => {
        let accOneBalanceBeforeTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });
        let NFT721value = new BN(1);
        let isERC1155 = false;
        let lotType = 1; // lotType.FixedPrice

        for(let i = 0; i < addNFT721Num; i++){
            await MarketPlace.add(ERC721Address, NFT721ids[i], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });
        }
        
        let accOneBalanceAfterTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });

        assert.notEqual(accOneBalanceBeforeTransfer, accOneBalanceAfterTransfer, "before add NFT-721 to Market Place and after should not be equal");
        assert.equal(String(accOneBalanceAfterTransfer), (new BN(NFT721value)).mul(new BN(addNFT721Num)), "after add NFT-721 to Market Place amount is wrong");
    });

    it("sell NFT for tokens (ERC-20)", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));
        let lotPrice = (new BN(1)).mul(tokenbits);
        let date = await web3.eth.getBlock("latest");
        let lotStartDate = (new BN(date.timestamp)).add(new BN(5));

        let openForOffers = true;

        for(let i = 0; i < addNFT721Num; i++){
            await MarketPlace.sell(userLotsIds[i], ERC20Address, lotPrice, openForOffers, lotStartDate, { from: accountOne });
        }
        
        let lotInfo = await MarketPlace.lots(userLotsIds[1], { from: accountOne });
        assert.equal(lotStartDate, Number(lotInfo.sellStart), "start date of lot is wrong");
        assert.equal(lotPrice, Number(lotInfo.price.buyerPrice), "lot price is wrong");
    });

    it("make offer with crypto", async () => {
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotId = userLotsIds[0];

        let exchangeNFTindexes = [];
        const tokenbits = (new BN(10)).pow(new BN(18));
        let tokensAmount = new BN(0);
        let cryptoProposalAmount = new BN(1).mul(tokenbits);

        let proposalsAmount = 100;

        for(let i = 0; i < proposalsAmount; i++){
            await MarketPlace.makeOffer(lotId, exchangeNFTindexes, constants.ZERO_ADDRESS, 
                tokensAmount, { from: accountTwo, value: (Number(commissionOffer) + Number(cryptoProposalAmount)) });
        }

        let offersAmount = new BN(proposalsAmount);
        let lotOffersInfo = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        assert.equal(String(lotOffersInfo.length), offersAmount, "amount of offers is wrong");
    });

    it("cancel offer with cryptocurrancy", async () => {
        let getInfo = await MarketPlace.getInfo(accountTwo, { from: accountOne });
        let lotOffers = [];

        for(let i = 0; i < getInfo.userOffers.length; i++) {
            lotOffers.push(Number(getInfo.userOffers[i]));
        }

        const tokenbits = (new BN(10)).pow(new BN(18));

        let cryptoProposalAmount = new BN(1);
        let commision = commissionOffer / tokenbits;
        
        let cryptoBalanceBefore = (await web3.eth.getBalance(accountTwo) / tokenbits).toFixed(0);

        let receipt = await MarketPlace.cancelOffer(lotOffers[0], { from: accountTwo });
        console.log("gas used for cancel 1st offer: ", receipt.receipt.gasUsed);

        let cryptoBalanceAfter = (await web3.eth.getBalance(accountTwo) / tokenbits).toFixed(0);

        assert.equal((Number(cryptoBalanceBefore) + Number(cryptoProposalAmount) + Number(commision)), cryptoBalanceAfter, 
            "balance of crypto after canceled is wrong");
    });

    it("choose offer with cryptocurrancy", async () => {
        const tokenbits = (new BN(10)).pow(new BN(18));
        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotId = userLotsIds[0];
        let soldNFTAmount = new BN(1);

        let lotOffers = await MarketPlace.getLotsOffers(lotId, { from: accountTwo });

        let cryptoProposalAmount = new BN(1).mul(tokenbits);
        let receivedCommission = await MarketPlace.marketCommission({ from: accountOne });
        
        let accOneCryptoBalanceBefore = (await web3.eth.getBalance(accountOne));
        let accTwoNFTBalanceBefore = await ERC721.balanceOf(accountTwo, { from: accountTwo });

        let receipt = await MarketPlace.chooseOffer(lotId, lotOffers[lotOffers.length - 1], NFTdata, { from: accountOne });

        const gasUsed = receipt.receipt.gasUsed;
        console.log("gas used for accept last offer: ", gasUsed);

        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        let gasFee = (new BN(gasUsed)).mul(new BN(gasPrice));

        let accOneCryptoBalanceAfter = (await web3.eth.getBalance(accountOne));
        let accTwoNFTBalanceAfter = await ERC721.balanceOf(accountTwo, { from: accountTwo });

        let rewardWithCommission = cryptoProposalAmount.sub((cryptoProposalAmount.mul(receivedCommission)).div(new BN(1000)));
        let expectedAccOneBalance = (rewardWithCommission.add(new BN(accOneCryptoBalanceBefore))).sub(gasFee);
        
        assert.equal(accOneCryptoBalanceAfter, expectedAccOneBalance, "accountOne balance is wrong after choosed offer");
        assert.equal(String(accTwoNFTBalanceAfter.sub(accTwoNFTBalanceBefore)), soldNFTAmount, 
            "accountTree NFT balance is wrong");
    });

    it("buy NFT for tokens (ERC-20)", async () => {
        await time.increase(time.duration.minutes(5));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotInfo = await MarketPlace.lots(userLotsIds[1], { from: accountTwo });
        let accTwoNFTBalanceBefore = Number(await ERC721.balanceOf.call(accountTwo, { from: accountTwo }));
        let accTwoTokensBalBefore = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        let receipt = await MarketPlace.buy(userLotsIds[1], NFTdata, { from: accountTwo });

        console.log("gas used for 1st lot: ", receipt.receipt.gasUsed);

        let accTwoNFTBalanceAfter = Number(await ERC721.balanceOf.call(accountTwo, { from: accountTwo }));
        let accTwoTokensBalAfter = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        assert.equal((accTwoNFTBalanceBefore + Number(lotInfo.creationInfo.amount)), accTwoNFTBalanceAfter, 
            "NFT was not bought");

        assert.equal((accTwoTokensBalBefore - Number(lotInfo.price.buyerPrice)), accTwoTokensBalAfter, 
            "tokens has not been withdrawn from buyer's balance");   
    });

    it("buy NFT for tokens (ERC-20)", async () => {
        await time.increase(time.duration.minutes(5));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let half = Math.floor((userLotsIds.length - 1) / 2);

        let lotInfo = await MarketPlace.lots(userLotsIds[half], { from: accountTwo });
        let accTwoNFTBalanceBefore = Number(await ERC721.balanceOf.call(accountTwo, { from: accountTwo }));
        let accTwoTokensBalBefore = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        let receipt = await MarketPlace.buy(userLotsIds[half], NFTdata, { from: accountTwo });

        console.log("gas used for 50th lot: ", receipt.receipt.gasUsed);

        let accTwoNFTBalanceAfter = Number(await ERC721.balanceOf.call(accountTwo, { from: accountTwo }));
        let accTwoTokensBalAfter = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        assert.equal((accTwoNFTBalanceBefore + Number(lotInfo.creationInfo.amount)), accTwoNFTBalanceAfter, 
            "NFT was not bought");

        assert.equal((accTwoTokensBalBefore - Number(lotInfo.price.buyerPrice)), accTwoTokensBalAfter, 
            "tokens has not been withdrawn from buyer's balance");   
    });

    it("buy NFT for tokens (ERC-20)", async () => {
        await time.increase(time.duration.minutes(5));

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountTwo });

        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }

        let lotInfo = await MarketPlace.lots(userLotsIds[userLotsIds.length - 1], { from: accountTwo });
        let accTwoNFTBalanceBefore = Number(await ERC721.balanceOf.call(accountTwo, { from: accountTwo }));
        let accTwoTokensBalBefore = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        let receipt = await MarketPlace.buy(userLotsIds[userLotsIds.length - 1], NFTdata, { from: accountTwo });

        console.log("gas used for last lot: ", receipt.receipt.gasUsed);

        let accTwoNFTBalanceAfter = Number(await ERC721.balanceOf.call(accountTwo, { from: accountTwo }));
        let accTwoTokensBalAfter = Number(await ERC20.balanceOf.call(accountTwo, { from: accountTwo }));

        assert.equal((accTwoNFTBalanceBefore + Number(lotInfo.creationInfo.amount)), accTwoNFTBalanceAfter, 
            "NFT was not bought");

        assert.equal((accTwoTokensBalBefore - Number(lotInfo.price.buyerPrice)), accTwoTokensBalAfter, 
            "tokens has not been withdrawn from buyer's balance");   
    });
});