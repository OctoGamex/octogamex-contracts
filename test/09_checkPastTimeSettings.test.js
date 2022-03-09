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

contract("check if time is less than block time", async accounts => {
    const [deployer, accountOne, accountTwo, accountThree, accountFour] = accounts;

    let ERC1155, ERC721, ERC20, MarketPlace, Auction;
    let ERC1155Address, ERC721Address, ERC20Address, MarketPlaceAddress, AuctionAddress;

    let commissionOffer;

    const NFT1155id = new BN(1);
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
        // const tokenbits = (new BN(10)).pow(new BN(18));
        // let tokensAmount = new BN(1000).mul(tokenbits);

        const NFT1155amount = new BN(100);
        const NFTapproved = true;

        await ERC1155.mint(accountOne, NFT1155id, NFT1155amount, NFTdata, { from: accountOne });
        await ERC1155.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });

        for(let i = 0; i < addNFT721Num; i++) {
            NFT721ids.push(new BN(i));
            await ERC721.mint(accountOne, NFT721ids[i], { from: accountOne });
            await ERC721.setApprovalForAll(MarketPlaceAddress, NFTapproved, { from: accountOne });
            await ERC721.setApprovalForAll(AuctionAddress, NFTapproved, { from: accountOne });
        }        

        // await ERC20.mint(accountTwo, tokensAmount, { from: accountTwo });
        // await ERC20.approve(AuctionAddress, tokensAmount, { from: accountTwo });

        // await ERC20.mint(accountThree, tokensAmount, { from: accountThree });
        // await ERC20.approve(AuctionAddress, tokensAmount, { from: accountThree });     
    });

    it("users should be able to add NFT ERC-721", async () => {
        let accOneBalanceBeforeTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });
        let NFT721value = new BN(1);
        let isERC1155 = false;
        let lotType = 1; // lotType.FixedPrice

        await MarketPlace.add(ERC721Address, NFT721ids[0], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });

        lotType = 2; // lotType.Auction
        await MarketPlace.add(ERC721Address, NFT721ids[1], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });

        lotType = 3; // lotType.Exchange
        await MarketPlace.add(ERC721Address, NFT721ids[2], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });

        // for(let i = 0; i < addNFT721Num; i++) {
        //     await MarketPlace.add(ERC721Address, NFT721ids[i], NFT721value, isERC1155, lotType, NFTdata, { from: accountOne });
        // }

        let userLotsIds = [];
        let getInfo = await MarketPlace.getInfo(accountOne, { from: accountOne });
        for(let i = 0; i < getInfo.userLots.length; i++) {
            userLotsIds.push(Number(getInfo.userLots[i]));
        }
        // console.log(userLotsIds.length)
        let lotInfo = await MarketPlace.getLots([userLotsIds[0]], { from: accountOne });  
        assert.equal(accountOne, lotInfo.creationInfo.owner, "lot information is wrong");

        let accOneBalanceAfterTransfer = await ERC721.balanceOf.call(MarketPlaceAddress, { from: accountOne });

        assert.notEqual(accOneBalanceBeforeTransfer, accOneBalanceAfterTransfer, "before add NFT-721 to Market Place and after should not be equal");
        assert.equal(String(accOneBalanceAfterTransfer), NFT721value.mul(new BN(userLotsIds.length)), "after add NFT-721 to Market Place amount is wrong");
    });

    // it("users should be able to add NFT ERC-1155", async () => {
    //     let accTwoBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accTwoNFT1155id, { from: accountTwo });
    //     let accThreeBalanceBeforeTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accThreeNFT1155id, { from: accountThree });

    //     let accTwoNFT1155value = new BN(10);
    //     let accThreeNFT1155value = new BN(15);
    //     let isERC1155 = true;
    //     let addNFTNum = 10; // max 10
    //     let lotType = 2; // lotType.Auction

    //     for(let i = 0; i < addNFTNum; i++) {
    //         await MarketPlace.add(ERC1155Address, accTwoNFT1155id, accTwoNFT1155value, isERC1155, lotType, NFTdata, { from: accountTwo });
    //         await MarketPlace.add(ERC1155Address, accThreeNFT1155id, accThreeNFT1155value, isERC1155, lotType, NFTdata, { from: accountThree });
    //     }       

    //     let accTwoBalanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accTwoNFT1155id, { from: accountTwo });
    //     let accThreeBalanceAfterTransfer = await ERC1155.balanceOf.call(MarketPlaceAddress, accThreeNFT1155id, { from: accountThree });

    //     assert.notEqual(accTwoBalanceBeforeTransfer, accTwoBalanceAfterTransfer, 
    //         "before add NFT-1155 to Market Place and after should not be equal (accTwo)");
    //     assert.equal(Number(accTwoBalanceAfterTransfer), (Number(accTwoNFT1155value) * addNFTNum), 
    //     "after add NFT-1155 to Market Place amount is wrong (accTwo)");

    //     assert.notEqual(accThreeBalanceBeforeTransfer, accThreeBalanceAfterTransfer, 
    //         "before add NFT-1155 to Market Place and after should not be equal (accThree)");
    //     assert.equal(Number(accThreeBalanceAfterTransfer), (Number(accThreeNFT1155value) * addNFTNum),
    //     "after add NFT-1155 to Market Place amount is wrong (accThree)");
    // });
})