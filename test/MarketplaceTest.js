const NFT = artifacts.require("TestERC1155");
const Tokens = artifacts.require("TestERC20");
const Mar = artifacts.require("NFTMarketplace");
const TestERC721 = artifacts.require("TestERC721");

contract("NFT Marketplace", accounts => {

  const myEther = (web3.utils.toWei('1', "ether")).toString();
  const [accountOne, accountTwo] = accounts;
  let ERC1155, Marketplace, ERC20, ERC721;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  const data = 0;

  before(async () => {
    ERC1155 = await NFT.deployed({ from: accountOne });
    Marketplace = await Mar.deployed({ from: accountOne });
    ERC20 = await Tokens.deployed({ from: accountOne });
    ERC721 = await TestERC721.deployed({ from: accountOne });

    await ERC1155.mint(accountOne, 1, 100, data, { from: accountOne });
    await ERC1155.setApprovalForAll(Marketplace.address, true, { from: accountOne });
    await ERC1155.setApprovalForAll(Marketplace.address, true, { from: accountTwo });
    const createERC = myEther * 5;
    await ERC20.mint(accountTwo, createERC.toString(), { from: accountOne });
    await ERC20.increaseAllowance(Marketplace.address, createERC.toString(), { from: accountTwo });
    await ERC20.mint(accountOne, createERC.toString(), { from: accountOne });
    await ERC20.increaseAllowance(Marketplace.address, createERC.toString(), { from: accountOne });
    await ERC1155.safeTransferFrom(accountOne, accountTwo, 1, 10, data, { from: accountOne });
    await Marketplace.setNFT_Collection(ERC1155.address, true, { from: accountOne });
    await ERC721.mint(accountOne, 1, { from: accountOne });
    await ERC721.setApprovalForAll(Marketplace.address, true, { from: accountOne });
    await Marketplace.setNFT_Collection(ERC721.address, true, { from: accountOne });
  });

  it("Add NFT", async () => {

    const balanceERC_Before = await ERC1155.balanceOf.call(Marketplace.address, 1, { from: accountOne });

    await ERC1155.safeTransferFrom(accountOne, Marketplace.address, 1, 1, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountTwo });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountTwo });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountTwo });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountTwo });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountTwo });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountTwo });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne }); // 15
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });
    await Marketplace.add(ERC1155.address, 1, 1, true, data, { from: accountOne });

    await Marketplace.add(ERC721.address, 1, 1, false, data, { from: accountOne });

    const balanceERC_After = await ERC1155.balanceOf.call(Marketplace.address, 1, { from: accountOne });
    const lot1 = await Marketplace.lotOwner.call(accountOne, 0, { from: accountOne });
    assert.equal(parseInt(lot1), 0, "Add used safeTransferFrom not working");

    const lot2 = await Marketplace.lotOwner.call(accountTwo, 0, { from: accountOne });
    assert.equal(parseInt(lot2), 5, "Add used function add not working");

    assert.notEqual(balanceERC_After, balanceERC_Before, "One of added not working",);

  });

  it("Return token", async () => {

    const balanceBefore = await ERC1155.balanceOf.call(accountOne, 1, { from: accountOne });

    await Marketplace.getBack(0, data, { from: accountOne });

    const lot = await Marketplace.lots.call(0, { from: accountOne });
    assert.equal(parseInt(lot.creationInfo.owner), 0, "Return not working");

    const balanceAfter = await ERC1155.balanceOf.call(accountOne, 1, { from: accountOne });
    assert.notEqual(balanceBefore, balanceAfter, "Get back token not working",);

  });

  it("Sell token", async () => {

    await Marketplace.sell(1, zeroAddress, myEther, data, { from: accountOne });
    await Marketplace.sell(2, ERC20.address, myEther, data, { from: accountOne });
    await Marketplace.sell(3, zeroAddress, myEther, data, { from: accountOne });
    await Marketplace.sell(4, ERC20.address, myEther, data, { from: accountOne });
    await Marketplace.sell(6, zeroAddress, myEther, data, { from: accountOne });
    await Marketplace.sell(8, ERC20.address, myEther, data, { from: accountOne });
    await Marketplace.sell(10, zeroAddress, myEther, data, { from: accountOne });
    await Marketplace.sell(14, zeroAddress, myEther, data, { from: accountOne });

    const amount1 = await Marketplace.lots.call(1, { from: accountOne });
    assert.equal(parseInt(amount1.price.buyerPrice), myEther, "Sell crypto not working");
    assert.equal(parseInt(amount1.selling), 1, "Sell crypto not working");

    const amount2 = await Marketplace.lots.call(2, { from: accountOne });
    assert.equal(amount2.price.contractAddress, ERC20.address, "Sell token not working");
    assert.equal(parseInt(amount2.price.buyerPrice), parseInt(myEther), "Sell token not working");
    assert.equal(parseInt(amount2.selling), 1, "Sell token not working");

  });

  it("Buy token", async () => {

    const balanceBefore = await ERC1155.balanceOf.call(accountTwo, 1, { from: accountTwo });
    await Marketplace.buy(1, 0, { from: accountTwo, value: myEther });
    const amount = await Marketplace.lots.call(1, { from: accountTwo });
    assert.equal(parseInt(amount.price.buyerPrice), 0, "Lot not cleared");
    const balanceAfter = await ERC1155.balanceOf.call(accountTwo, 1, { from: accountTwo });
    assert.notEqual(balanceAfter, balanceBefore, "NFT not sended",);

    const soldPrice = await Marketplace.lots.call(2, { from: accountTwo });
    const NFT_Before = await ERC1155.balanceOf.call(accountTwo, 1, { from: accountTwo });
    await Marketplace.buy(2, 0, { from: accountTwo});
    const buyPrice = await Marketplace.lots.call(2, { from: accountTwo });
    assert.equal(parseInt(buyPrice.price.buyerPrice), 0, "Lot not cleared");
    const NFT_After = await ERC1155.balanceOf.call(accountTwo, 1, { from: accountTwo });
    assert.notEqual(NFT_After, NFT_Before, "NFT not sended",);
    const balanceERC20_After = await ERC20.balanceOf.call(accountOne, { from: accountTwo });
    assert.equal(parseInt(balanceERC20_After), parseInt(parseInt(myEther * 5) + parseInt(soldPrice.price.sellerPrice)), "Tokens not sended",);

  });

  it("Make proposal (token)", async () => {

    await Marketplace.makeOffer(3, [], ERC20.address, 100, { from: accountTwo, value: myEther/20 });
    const lot = await Marketplace.offers.call(0, { from: accountTwo });
    assert.equal(lot.cryptoOffer.contractAddress, ERC20.address, "Proposal token not working");
    const balance = await ERC20.balanceOf.call(Marketplace.address, { from: accountTwo });
    assert.equal(parseInt(balance), 100, "Proposal token not working");

  });

  it("Make proposal (token + NFT)", async () => {

    await Marketplace.makeOffer(4, [5], ERC20.address, 100, { from: accountTwo, value: myEther/20 });
    const lot = await Marketplace.offers.call(1, { from: accountTwo });
    assert.equal(lot.cryptoOffer.contractAddress, ERC20.address, "Proposal token not working");
    const balance = await ERC20.balanceOf.call(Marketplace.address, { from: accountTwo });
    assert.equal(parseInt(balance), 200, "Proposal token not working");

  });

  it("Make proposal (NFT)", async () => {

    await Marketplace.makeOffer(6, [7], zeroAddress, 0, { from: accountTwo, value: myEther/20 });
    const lot = await Marketplace.offers.call(2, { from: accountTwo });
    //assert.equal(lot[1], 1, "Proposal NFT not working");

  });

  it("Make proposal (crypto + NFT)", async () => {

    await Marketplace.makeOffer(8, [9], zeroAddress, 0, { from: accountTwo, value: myEther });
    const lot = await Marketplace.offers.call( 3, { from: accountTwo });
    //assert.equal(parseInt(lot), 2, "Proposal token not working");


  });

  it("Make proposal (crypto)", async () => {

    await Marketplace.makeOffer(10, [], zeroAddress, 0, { from: accountTwo, value: myEther });
    const offer = await Marketplace.offers.call(4, { from: accountTwo });
    assert.equal(parseInt(offer.cryptoOffer.buyerPrice), parseInt(myEther), "Proposal token not working");

  });

  it("Choose offer (token)", async () => {

    const tokensBefore = await ERC20.balanceOf.call(accountOne);
    const NFT_Before = await ERC1155.balanceOf.call(accountTwo, 1);
    await Marketplace.chooseOffer(3, 0, data, { from: accountOne });
    const tokensAfter = await ERC20.balanceOf.call(accountOne);
    const NFT_After = await ERC1155.balanceOf.call(accountTwo, 1);
    assert.notEqual(tokensAfter, tokensBefore, "(token) not working")
    assert.notEqual(NFT_Before, NFT_After, "NFT not working")

  });

  it("Choose offer (token + NFT)", async () => {

    const tokensBefore = await ERC20.balanceOf.call(accountOne);
    const NFT_Before = await ERC1155.balanceOf.call(accountTwo, 1);
    await Marketplace.chooseOffer(4, 1, data, { from: accountOne });
    const tokensAfter = await ERC20.balanceOf.call(accountOne);
    const NFT_After = await ERC1155.balanceOf.call(accountTwo, 1);
    assert.notEqual(tokensAfter, tokensBefore, "Tokens not transfered")
    assert.notEqual(NFT_Before, NFT_After, "NFT not transfered")

  });

  it("Choose offer (NFT)", async () => {

    const nft1 = await ERC1155.balanceOf.call(accountOne, 1);
    await Marketplace.chooseOffer(6, 2, data, { from: accountOne });
    const nft2 = await ERC1155.balanceOf.call(accountOne, 1);
    assert.notEqual(nft1, nft2, "Choose offer (NFT) not working")

  });

  it("Choose offer (crypto + NFT)", async () => {

    const nft1 = await ERC1155.balanceOf.call(accountOne, 1);
    await Marketplace.chooseOffer(8, 3, data, { from: accountOne });
    const nft2 = await ERC1155.balanceOf.call(accountOne, 1);
    assert.notEqual(nft1, nft2, "Choose offer (crypto + NFT) not working")


  });

  it("Choose offer (crypto)", async () => {
    
  await Marketplace.chooseOffer(10, 4, data, { from: accountOne });

  });

  it("Make proposals for cancels", async () => {

    await Marketplace.makeOffer(14, [], ERC20.address, 100, { from: accountTwo, value: myEther/20 });

    await Marketplace.makeOffer(14, [11], ERC20.address, 100, { from: accountTwo, value: myEther/20 });

    await Marketplace.makeOffer(14, [12], zeroAddress, 0, { from: accountTwo, value: myEther/20 });

    await Marketplace.makeOffer(14, [13], zeroAddress, 0, { from: accountTwo, value: myEther });

    await Marketplace.makeOffer(14, [], zeroAddress, 0, { from: accountTwo, value: myEther });

  });

  it("Cancel proposal", async () => {

    const balanceTokenBefore = await ERC20.balanceOf.call(Marketplace.address, { from: accountTwo });
    await Marketplace.cancelOffer(5, { from: accountTwo });
    const balanceTokenAfter = await ERC20.balanceOf.call(Marketplace.address, { from: accountTwo });
    assert.notEqual(parseInt(balanceTokenAfter), parseInt(balanceTokenBefore), "Wrong cancel token");

    const balanceTokenNFT_Before = await ERC20.balanceOf.call(accountTwo, { from: accountOne });
    const balanceNFT_TokenBefore = await ERC1155.balanceOf.call(Marketplace.address, 1, { from: accountOne });
    await Marketplace.cancelOffer(6, { from: accountTwo });
    const balanceTokenNFT_After = await ERC20.balanceOf.call(accountTwo, { from: accountOne });
    const balanceNFT_TokenAfter = await ERC1155.balanceOf.call(Marketplace.address, 1, { from: accountOne });
    assert.notEqual(parseInt(balanceTokenNFT_After), parseInt(balanceTokenNFT_Before), "Tokens not transfered");
    assert.notEqual(parseInt(balanceNFT_TokenAfter), parseInt(balanceNFT_TokenBefore), "NFT not transfered");

    const balanceNFT_Before = await ERC1155.balanceOf.call(Marketplace.address, 1, { from: accountOne });
    await Marketplace.cancelOffer(7, { from: accountTwo });
    const balanceNFT_After = await ERC1155.balanceOf.call(Marketplace.address, 1, { from: accountOne });
    assert.notEqual(parseInt(balanceNFT_After), parseInt(balanceNFT_Before), "NFT not transfered");

    const balanceNFT_CryptoBefore = await ERC1155.balanceOf.call(Marketplace.address, 1, { from: accountOne });
    await Marketplace.cancelOffer(8, { from: accountTwo });
    const balanceNFT_CryptoAfter = await ERC1155.balanceOf.call(Marketplace.address, 1, { from: accountOne });
    assert.notEqual(parseInt(balanceNFT_CryptoAfter), parseInt(balanceNFT_CryptoBefore), "Wrong cancel token");

    await Marketplace.cancelOffer(9, { from: accountTwo });

  });

  it("Create auction", async () => {

    const myDate = Math.floor(Date.now() / 1000);
    await Marketplace.startAuction(15, myDate, myDate + 20, 100, zeroAddress, myEther, { from: accountOne }); //crypto
    await Marketplace.startAuction(16, myDate, myDate + 20, 100, ERC20.address, myEther, { from: accountOne }); //tokens

    const auctionCrypto = await Marketplace.lots.call(15, { from: accountOne });
    const auctionTokens = await Marketplace.lots.call(16, { from: accountOne });

    assert.equal(auctionCrypto.auction.step, 100, "Step write wrong (crypto)");
    assert.equal(auctionTokens.auction.step, 100, "Step write wrong (tokens)");
    assert.equal(auctionCrypto.auction.nextStep, myEther, "Next step write wrong (crypto)");
    assert.equal(auctionTokens.auction.nextStep, myEther, "Next step write wrong (tokens)");
    assert.equal(auctionCrypto.price.contractAddress, zeroAddress, "Tokens address write wrong (crypto)");
    assert.equal(auctionTokens.price.contractAddress, ERC20.address, "Tokens address write wrong (tokens)");

  });

  it("Make bid", async () => {

    await Marketplace.makeBid(15, myEther, { from: accountTwo, value: myEther});
    const auctionCryptoFirst = await Marketplace.lots.call(15, { from: accountOne });
    assert.equal(parseInt(auctionCryptoFirst.price.buyerPrice), parseInt(myEther), "Price not write right");
    assert.equal(parseInt(auctionCryptoFirst.auction.nextStep), parseInt(myEther) + parseInt(myEther)/10, "Next step writed wrong");
    assert.equal(auctionCryptoFirst.auction.lastBid, accountTwo, "In bid writed wrong address");

    await Marketplace.makeBid(15, myEther, { from: accountTwo, value: myEther});
    const auctionCryptoSecond = await Marketplace.lots.call(15, { from: accountOne });
    assert.equal(parseInt(auctionCryptoSecond.price.buyerPrice), parseInt(myEther) * 2, "Price not write right");
    assert.equal(parseInt(auctionCryptoSecond.auction.nextStep), parseInt(myEther) * 2 + (parseInt(myEther) * 2 / 10), "Next step writed wrong");

    await Marketplace.makeBid(15, myEther, { from: accountOne, value: myEther * 3});
    const auctionCryptoThird = await Marketplace.lots.call(15, { from: accountOne });
    assert.equal(parseInt(auctionCryptoThird.price.buyerPrice), parseInt(myEther) * 3, "Price not write right");
    assert.equal(parseInt(auctionCryptoThird.auction.nextStep), parseInt(myEther) * 3 + (parseInt(myEther) * 3 / 10), "Next step writed wrong");
    assert.equal(auctionCryptoThird.auction.lastBid, accountOne, "In bid writed wrong address");

    await ERC20.approve(Marketplace.address, (parseInt(myEther) * 5).toString(), {from: accountOne})
    await ERC20.approve(Marketplace.address, (parseInt(myEther) * 5).toString(), {from: accountTwo})

    await Marketplace.makeBid(16, myEther, { from: accountTwo});
    const auctionTokensFirst = await Marketplace.lots.call(16, { from: accountOne });
    assert.equal(parseInt(auctionTokensFirst.price.buyerPrice), parseInt(myEther), "Price not write right");
    assert.equal(parseInt(auctionTokensFirst.auction.nextStep), parseInt(myEther) + parseInt(myEther)/10, "Next step writed wrong");
    assert.equal(auctionTokensFirst.auction.lastBid, accountTwo, "In bid writed wrong address");

    await Marketplace.makeBid(16, myEther, { from: accountTwo});
    const auctionTokensSecond = await Marketplace.lots.call(16, { from: accountOne });
    assert.equal(parseInt(auctionTokensSecond.price.buyerPrice), parseInt(myEther) * 2, "Price not write right");
    assert.equal(parseInt(auctionTokensSecond.auction.nextStep), parseInt(myEther) * 2 + (parseInt(myEther) * 2 / 10), "Next step writed wrong");

    await Marketplace.makeBid(16, (parseInt(myEther) * 3).toString(), { from: accountOne});
    const auctionTokensThird = await Marketplace.lots.call(16, { from: accountOne });
    assert.equal(parseInt(auctionTokensThird.price.buyerPrice), parseInt(myEther) * 3, "Price not write right");
    assert.equal(parseInt(auctionTokensThird.auction.nextStep), parseInt(myEther) * 3 + (parseInt(myEther) * 3 / 10), "Next step writed wrong");
    assert.equal(auctionTokensThird.auction.lastBid, accountOne, "In bid writed wrong address");

  });

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

  it("End auction", async () => {

    await sleep(15000);

    const NFT_15_Before = await ERC1155.balanceOf.call(accountOne, 1);
    await Marketplace.endAuction(15, data, { from: accountOne});
    const NFT_15_After = await ERC1155.balanceOf.call(accountOne, 1);
    assert.notEqual(NFT_15_After, NFT_15_Before, "NFT not sended");

    const NFT_16_Before = await ERC1155.balanceOf.call(accountOne, 1);
    const tokens_1_Before = await ERC20.balanceOf.call(accountOne);
    const tokens_2_Before = await ERC20.balanceOf.call(accountTwo);
    await Marketplace.endAuction(16, data, { from: accountTwo});
    const tokens_1_After = await ERC20.balanceOf.call(accountOne);
    const tokens_2_After = await ERC20.balanceOf.call(accountTwo);
    const NFT_16_After = await ERC1155.balanceOf.call(accountOne, 1);
    assert.notEqual(parseInt(tokens_1_After), parseInt(tokens_1_Before), "Tokens not sended");
    assert.equal(parseInt(tokens_2_Before), parseInt(tokens_2_After), "Tokens not sended")
    assert.notEqual(parseInt(NFT_16_After), parseInt(NFT_16_Before), "NFT not sended");
  });

  it("Exchange NFT", async () => {

    await Marketplace.sell(17, zeroAddress, 0, data, { from: accountOne });
    const exchangeNFT = await Marketplace.lots.call(17);
    assert.equal(parseInt(exchangeNFT.selling), 3, "Not setted to exchange");
    await Marketplace.makeOffer(17, [], ERC20.address, 100, { from: accountTwo, value: myEther/20 });
    // can create offer to this lot
  });

});