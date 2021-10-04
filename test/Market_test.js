const NFT = artifacts.require("TestERC1155");
const Tokens = artifacts.require("TestERC20");
const Mar = artifacts.require("NFT_Market");

contract("NFT Exchanger", accounts => {

  const my_ether = web3.utils.toWei('1', "ether");
  const [account_one, account_two, account_three] = accounts;
  let ERC1155, Market, ERC20;
  const zero_address = "0x0000000000000000000000000000000000000000";

  const data = 0;

  const [id_one, id_two] = [1, 2];

  before(async () => {
    ERC1155 = await NFT.deployed({ from: account_one });
    Market = await Mar.deployed({ from: account_one });
    ERC20 = await Tokens.deployed({ from: account_one });

    await ERC1155.mint(account_one, 1, 100, 0, { from: account_one });
    await ERC1155.setApprovalForAll(Market.address, true, { from: account_one });
    await ERC1155.setApprovalForAll(Market.address, true, { from: account_two });
    const create_ERC = my_ether * 5;
    await ERC20.mint(account_two, create_ERC.toString(), { from: account_one });
    await ERC20.increaseAllowance(Market.address, create_ERC.toString(), { from: account_two });
    await ERC20.mint(account_one, create_ERC.toString(), { from: account_one });
    await ERC20.increaseAllowance(Market.address, create_ERC.toString(), { from: account_one });
    await ERC1155.safeTransferFrom(account_one, account_two, 1, 10, 0, { from: account_one });
  });

  it("Add NFT", async () => {

    const balanceERC_before = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });

    await ERC1155.safeTransferFrom(account_one, Market.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_two });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_two });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_two });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_two });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_two });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_two });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });

    const balanceERC_after = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });
    const lot1 = await Market.lot_owner.call(account_one, 0, { from: account_one });
    assert.equal(parseInt(lot1), 0, "Add used safeTransferFrom not working");

    const lot2 = await Market.lot_owner.call(account_two, 0, { from: account_one });
    assert.equal(parseInt(lot2), 5, "Add used function add not working");

    assert.notEqual(balanceERC_after, balanceERC_before, "One of added not working",);

  });

  it("Return token", async () => {

    const balance_before = await ERC1155.balanceOf.call(account_one, 1, { from: account_one });

    await Market.get_back(0, 0, { from: account_one });

    const lot = await Market.lots.call(0, { from: account_one });
    assert.equal(parseInt(lot.creation_info.owner), 0, "Return not working");

    const balance_after = await ERC1155.balanceOf.call(account_one, 1, { from: account_one });
    assert.notEqual(balance_before, balance_after, "Get back token not working",);

  });

  it("Sell token", async () => {

    await Market.sell(1, zero_address, my_ether, { from: account_one });
    await Market.sell(2, ERC20.address, my_ether, { from: account_one });
    await Market.sell(3, zero_address, my_ether, { from: account_one });
    await Market.sell(4, ERC20.address, my_ether, { from: account_one });
    await Market.sell(6, zero_address, my_ether, { from: account_one });
    await Market.sell(8, ERC20.address, my_ether, { from: account_one });
    await Market.sell(10, zero_address, my_ether, { from: account_one });
    await Market.sell(14, zero_address, my_ether, { from: account_one });

    const amount1 = await Market.lots.call(1, { from: account_one });
    assert.equal(parseInt(amount1.price.buyer_price), my_ether, "Sell crypto not working");
    assert.equal(parseInt(amount1.selling), 1, "Sell crypto not working");

    const amount2 = await Market.lots.call(2, { from: account_one });
    assert.equal(amount2.price.contract_add, ERC20.address, "Sell token not working");
    assert.equal(parseInt(amount2.price.buyer_price), parseInt(my_ether), "Sell token not working");
    assert.equal(parseInt(amount2.selling), 1, "Sell token not working");

  });

  it("Buy token", async () => {

    const balance_before = await ERC1155.balanceOf.call(account_two, 1, { from: account_two });
    await Market.buy(1, 0, { from: account_two, value: my_ether });
    const amount = await Market.lots.call(1, { from: account_two });
    assert.equal(parseInt(amount.price.buyer_price), 0, "Lot not cleared");
    const balance_after = await ERC1155.balanceOf.call(account_two, 1, { from: account_two });
    assert.notEqual(balance_after, balance_before, "NFT not sended",);

    const sold_price = await Market.lots.call(2, { from: account_two });
    const nft_before = await ERC1155.balanceOf.call(account_two, 1, { from: account_two });
    await Market.buy(2, 0, { from: account_two});
    const buy_price = await Market.lots.call(2, { from: account_two });
    assert.equal(parseInt(buy_price.price.buyer_price), 0, "Lot not cleared");
    const nft_after = await ERC1155.balanceOf.call(account_two, 1, { from: account_two });
    assert.notEqual(nft_after, nft_before, "NFT not sended",);
    const balance_ERC20_after = await ERC20.balanceOf.call(account_one, { from: account_two });
    assert.equal(parseInt(balance_ERC20_after), parseInt(parseInt(my_ether * 5) + parseInt(sold_price.price.seller_price)), "Tokens not sended",);

  });

  it("Make proposal (token)", async () => {

    await Market.make_offer(3, [], ERC20.address, 100, [], { from: account_two, value: my_ether/20 });
    const lot = await Market.offers.call(0, { from: account_two });
    assert.equal(lot.crypto_proposal.contract_add, ERC20.address, "Proposal token not working");
    const balance = await ERC20.balanceOf.call(Market.address, { from: account_two });
    assert.equal(parseInt(balance), 100, "Proposal token not working");

  });

  it("Make proposal (token + NFT)", async () => {

    await Market.make_offer(4, [5], ERC20.address, 100, [], { from: account_two, value: my_ether/20 });
    const lot = await Market.offers.call(1, { from: account_two });
    assert.equal(lot.crypto_proposal.contract_add, ERC20.address, "Proposal token not working");
    const balance = await ERC20.balanceOf.call(Market.address, { from: account_two });
    assert.equal(parseInt(balance), 200, "Proposal token not working");

  });

  it("Make proposal (NFT)", async () => {

    await Market.make_offer(6, [7], zero_address, 0, [], { from: account_two, value: my_ether/20 });
    const lot = await Market.offers.call(2, { from: account_two });
    //assert.equal(lot[1], 1, "Proposal NFT not working");

  });

  it("Make proposal (crypto + NFT)", async () => {

    await Market.make_offer(8, [9], zero_address, 0, [], { from: account_two, value: my_ether });
    const lot = await Market.offers.call( 3, { from: account_two });
    //assert.equal(parseInt(lot), 2, "Proposal token not working");


  });

  it("Make proposal (crypto)", async () => {

    await Market.make_offer(10, [], zero_address, 0, [], { from: account_two, value: my_ether });
    const offer = await Market.offers.call(4, { from: account_two });
    assert.equal(parseInt(offer.crypto_proposal.buyer_price), parseInt(my_ether), "Proposal token not working");

  });

  it("Choose offer (token)", async () => {

    const tokens_before = await ERC20.balanceOf.call(account_one);
    const nft_before = await ERC1155.balanceOf.call(account_two, 1);
    await Market.choose_offer(3, 0, 0, { from: account_one });
    const tokens_after = await ERC20.balanceOf.call(account_one);
    const nft_after = await ERC1155.balanceOf.call(account_two, 1);
    assert.notEqual(tokens_after, tokens_before, "(token) not working")
    assert.notEqual(nft_before, nft_after, "NFT not working")

  });

  it("Choose offer (token + NFT)", async () => {

    const tokens_before = await ERC20.balanceOf.call(account_one);
    const nft_before = await ERC1155.balanceOf.call(account_two, 1);
    await Market.choose_offer(4, 1, 0, { from: account_one });
    const tokens_after = await ERC20.balanceOf.call(account_one);
    const nft_after = await ERC1155.balanceOf.call(account_two, 1);
    assert.notEqual(tokens_after, tokens_before, "Tokens not transfered")
    assert.notEqual(nft_before, nft_after, "NFT not transfered")

  });

  it("Choose offer (NFT)", async () => {

    const nft1 = await ERC1155.balanceOf.call(account_one, 1);
    await Market.choose_offer(6, 2, 0, { from: account_one });
    const nft2 = await ERC1155.balanceOf.call(account_one, 1);
    assert.notEqual(nft1, nft2, "Choose offer (NFT) not working")

  });

  it("Choose offer (crypto + NFT)", async () => {

    const nft1 = await ERC1155.balanceOf.call(account_one, 1);
    await Market.choose_offer(8, 3, 0, { from: account_one });
    const nft2 = await ERC1155.balanceOf.call(account_one, 1);
    assert.notEqual(nft1, nft2, "Choose offer (crypto + NFT) not working")


  });

  it("Choose offer (crypto)", async () => {
    
  await Market.choose_offer(10, 4, 0, { from: account_one });

  });

  it("Make proposals for cancels", async () => {

    await Market.make_offer(14, [], ERC20.address, 100, [], { from: account_two, value: my_ether/20 });

    await Market.make_offer(14, [11], ERC20.address, 100, [], { from: account_two, value: my_ether/20 });

    await Market.make_offer(14, [12], zero_address, 0, [], { from: account_two, value: my_ether/20 });

    await Market.make_offer(14, [13], zero_address, 0, [], { from: account_two, value: my_ether });

    await Market.make_offer(14, [], zero_address, 0, [], { from: account_two, value: my_ether });

  });

  it("Cancel proposal", async () => {

    const balance_token_before = await ERC20.balanceOf.call(Market.address, { from: account_two });
    await Market.cancel_offer(5, { from: account_two });
    const balance_token_after = await ERC20.balanceOf.call(Market.address, { from: account_two });
    assert.notEqual(parseInt(balance_token_after), parseInt(balance_token_before), "Wrong cancel token");

    const balance_token_nft_before = await ERC20.balanceOf.call(account_two, { from: account_one });
    const balance_nft_token_before = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });
    await Market.cancel_offer(6, { from: account_two });
    const balance_token_nft_after = await ERC20.balanceOf.call(account_two, { from: account_one });
    assert.notEqual(parseInt(balance_token_nft_after), parseInt(balance_token_nft_before), "Tokens not transfered");
    const balance_nft_token_after = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });
    assert.notEqual(parseInt(balance_nft_token_after), parseInt(balance_nft_token_before), "NFT not transfered");

    const balance_nft_before = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });
    await Market.cancel_offer(7, { from: account_two });
    const balance_nft_after = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });
    assert.notEqual(parseInt(balance_nft_after), parseInt(balance_nft_before), "NFT not transfered");

    const balance_nft_crypto_before = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });
    await Market.cancel_offer(8, { from: account_two });
    const balance_nft_crypto_after = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });
    assert.notEqual(parseInt(balance_nft_crypto_after), parseInt(balance_nft_crypto_before), "Wrong cancel token");

    await Market.cancel_offer(9, { from: account_two });

  });

});