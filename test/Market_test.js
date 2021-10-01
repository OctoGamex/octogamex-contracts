const NFT = artifacts.require("TestERC1155");
const Tokens = artifacts.require("TestERC20");
const Mar = artifacts.require("NFT_Market");

contract("NFT Exchanger", accounts => {

  const my_ether = web3.utils.toWei('1', "ether");
  const [account_one, account_two, account_three] = accounts;
  let ERC1155, Market, ERC20;
  const zero_address = "0x0000000000000000000000000000000000000000";

  const [id_one, id_two] = [1, 2];

  before(async () => {
    ERC1155 = await NFT.deployed({ from: account_one });
    Market = await Mar.deployed({ from: account_one });
    ERC20 = await Tokens.deployed({ from: account_one });

    await ERC1155.mint(account_one, 1, 10, 0, { from: account_one });
    await ERC1155.setApprovalForAll(Market.address, true, { from: account_one });
    await ERC1155.setApprovalForAll(Market.address, true, { from: account_two });
    const create_ERC = my_ether * 5;
    await ERC20.mint(account_two, create_ERC.toString(), { from: account_one });
    await ERC20.increaseAllowance(Market.address, create_ERC.toString(), { from: account_two });
    await ERC20.mint(account_one, create_ERC.toString(), { from: account_one });
    await ERC20.increaseAllowance(Market.address, create_ERC.toString(), { from: account_one });
    await ERC1155.safeTransferFrom(account_one, account_two, 1, 1, 0, { from: account_one });
  });

  it("Add NFT", async () => {

    await ERC1155.safeTransferFrom(account_one, Market.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_one });
    await Market.add(ERC1155.address, 1, 1, 0, { from: account_two });

    const lot1 = await Market.lot_owner.call(account_one, 0, { from: account_one });
    assert.equal(parseInt(lot1), 0, "Add used safeTransferFrom not working");

    const lot2 = await Market.lot_owner.call(account_one, 1, { from: account_one });
    assert.equal(parseInt(lot2), 1, "Add used function add not working");

    const balanceERC = await ERC1155.balanceOf.call(Market.address, 1, { from: account_one });
    assert.equal(parseInt(balanceERC), 6, "One of added not working",);

  });

  it("Return token", async () => {

    await Market.get_back(0, 0, { from: account_one });

    const lot = await Market.lots.call(0, { from: account_one });
    assert.equal(parseInt(lot.creation_info.owner), 0, "Return not working");

    const balance = await ERC1155.balanceOf.call(account_one, 1, { from: account_one });
    assert.equal(parseInt(balance), 5, "Get back token not working",);

  });

  it("Sell token", async () => {

    await Market.sell(1, zero_address, my_ether, { from: account_one });
    await Market.sell(2, ERC20.address, my_ether, { from: account_one });

    const amount1 = await Market.lots.call(1, { from: account_one });
    assert.equal(parseInt(amount1.price.buyer_price), my_ether, "Sell crypto not working");
    assert.equal(parseInt(amount1.selling), 1, "Sell crypto not working");

    const amount2 = await Market.lots.call(2, { from: account_one });
    assert.equal(amount2.price.contract_add, ERC20.address, "Sell token not working");
    assert.equal(parseInt(amount2.price.buyer_price), parseInt(my_ether), "Sell token not working");
    assert.equal(parseInt(amount2.selling), 1, "Sell token not working");

  });

  it("Buy token", async () => {

    await Market.buy(1, 0, { from: account_two, value: my_ether });
    const amount = await Market.lots.call(1, { from: account_two });
    assert.equal(parseInt(amount.price.buyer_price), 0, "Lot not cleared");
    const balance1 = await ERC1155.balanceOf.call(account_two, 1, { from: account_two });
    assert.equal(parseInt(balance1), 1, "NFT not sended",);

    const wallet = await Market.lots.call(2, { from: account_two });
    await Market.buy(2, 0, { from: account_two});
    const amount1 = await Market.lots.call(2, { from: account_two });
    assert.equal(parseInt(amount1.price.buyer_price), 0, "Lot not cleared");
    const balance2 = await ERC1155.balanceOf.call(account_two, 1, { from: account_two });
    assert.equal(parseInt(balance2), 2, "NFT not sended",);
    const balance3 = await ERC20.balanceOf.call(account_one, { from: account_two });
    assert.equal(parseInt(balance3), parseInt(parseInt(my_ether * 5) + parseInt(wallet.price.seller_price)), "Tokens not sended",);

  });

  it("Make proposal (token)", async () => {

    await Market.make_offer(3, [], ERC20.address, 100, [], { from: account_two, value: 2 });
    const lot = await Market.proposals.call(0, { from: account_one });
    assert.equal(lot.crypto_proposal.contract_add, ERC20.address, "Proposal token not working");
    const balance = await ERC20.balanceOf.call(Market.address, { from: account_one });
    assert.equal(parseInt(balance), 100, "Proposal token not working");

  });

  it("Make proposal (token + NFT)", async () => {

    await Market.make_offer(3, [4], ERC20.address, 100, [], { from: account_one, value: 2 });
    const lot = await Market.proposals.call(1, { from: account_one });
    assert.equal(lot.crypto_proposal.contract_add, ERC20.address, "Proposal token not working");
    const balance = await ERC20.balanceOf.call(Market.address, { from: account_one });
    assert.equal(parseInt(balance), 200, "Proposal token not working");

  });

  it("Make proposal (NFT)", async () => {

    await Market.make_offer(3, [4], zero_address, 0, [], { from: account_one, value: 2 });
    const lot = await Market.proposals.call(2, { from: account_one });
    //assert.equal(lot[1], 1, "Proposal NFT not working");

  });

  it("Make proposal (crypto + NFT)", async () => {

    await Market.make_offer(5, [4], zero_address, 0, [], { from: account_one, value: my_ether });
    const lot = await Market.proposals.call( 3, { from: account_one });
    //assert.equal(parseInt(lot), 2, "Proposal token not working");


  });

  it("Make proposal (crypto)", async () => {

    await Market.make_offer(3, [], zero_address, 0, [], { from: account_one, value: my_ether });
    const lot = await Market.proposals.call(4, { from: account_one });
    //assert.equal(parseInt(lot.crypto_proposal.buyer_price), parseInt(my_ether), "Proposal token not working");

  });

  it("Choose offer", async () => {

    const nft1 = await ERC1155.balanceOf.call(account_one, 1);
    await Market.choose_offer(5, 3, 0, { from: account_two });
    const nft2 = await ERC1155.balanceOf.call(account_one, 1);
    assert.notEqual(nft1, nft2, "Choose offer not working")

  });

  it("Cancel proposal", async () => {

    const balance1_1 = await ERC20.balanceOf.call(account_two, { from: account_one });
    await Market.cancel_offer(0, { from: account_two });
    const balance2_2 = await ERC20.balanceOf.call(account_two, { from: account_one });
    assert.notEqual(balance1_1, balance2_2, "Wrong cancel token");

    console.log(await Market.proposals.call(1));
    await Market.cancel_offer(1, { from: account_one });
    const balance1 = await ERC20.balanceOf.call(account_one, { from: account_one });
    assert.equal(parseInt(balance1), 1000, "Wrong cancel token + NFT");
    const balance2 = await ERC1155.balanceOf.call(Market.address, 2, { from: account_one });
    assert.equal(parseInt(balance2), 0, "Wrong cancel token + NFT");

    await Market.cancel_offer(2, { from: account_one });
    const balance3 = await ERC1155.balanceOf.call(Market.address, 3, { from: account_one });
    assert.equal(parseInt(balance3), 0, "Wrong cancel token");

    console.log(await Market.proposals.call(3));
    await Market.cancel_offer(3, { from: account_one });
    const balance4 = await ERC1155.balanceOf.call(Market.address, 4, { from: account_one });
    assert.equal(parseInt(balance4), 0, "Wrong cancel token");

  });

});