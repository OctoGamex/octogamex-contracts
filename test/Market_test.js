const NFT = artifacts.require("TestERC1155");
const Tokens = artifacts.require("TestERC20");
const Market = artifacts.require("NFT_Market");

contract("NFT Exchanger", accounts => {

  const my_ether = web3.utils.toWei('1', "ether");
  const [account_one, account_two, account_three] = accounts;
  let ERC1155, Mar;
  const zero_address = "0x0000000000000000000000000000000000000000";

  const [id_one, id_two] = [1, 2];

  before(async () => {
    ERC1155 = await NFT.deployed({ from: account_one });
    Mar = await Market.deployed({ from: account_one });
    ERC20 = await Tokens.deployed({ from: account_one });
  });

  it("Add NFT", async () => {

    await ERC1155.mint(account_one, 1, 1, 0, { from: account_one });
    await ERC1155.mint(account_one, 1, 1, 0, { from: account_one });
    await ERC1155.safeTransferFrom(account_one, Mar.address, 1, 1, 0, { from: account_one });
    await ERC1155.safeTransferFrom(account_one, Mar.address, 1, 1, 0, { from: account_one });
    const lot = await Mar.lot_owner.call(account_one, 0, { from: account_one });
    assert.equal(parseInt(lot), 0, "Sell not working");

  });

  it("Return token", async () => {

    await Mar.get_back(0, 0, { from: account_one });
    const lot = await Mar.lots.call(0, { from: account_one });
    assert.equal(parseInt(lot.id), 0, "Return not working");
    const balance = await ERC1155.balanceOf.call(account_one, 1, { from: account_one });
    assert.equal(parseInt(balance), 1, "Get back token not working",);

  });

  it("Sell token", async () => {

    await Mar.sell(1, my_ether, { from: account_one });
    const amount = await Mar.lots.call(1, { from: account_one });
    assert.equal(parseInt(amount.seller_price), my_ether, "Sell not working");
    assert.equal(parseInt(amount.selling), 1, "Sell not working");

  });

  it("Buy token", async () => {
    const value = await Mar.lots.call(1, { from: account_one });
    await Mar.buy(1, 0, { from: account_two, value: value.buyer_price });
    const amount = await Mar.lots.call(1, { from: account_two });
    assert.equal(parseInt(amount.buyer_price), 0, "Sell not working");
    const balance = await ERC1155.balanceOf.call(account_two, 1, { from: account_two });
    assert.equal(parseInt(balance), 1, "Get back token not working",);

  });

  it("Make proposal (token)", async () => {

    await ERC20.mint(account_one, 1000, { from: account_one });
    await ERC1155.mint(account_two, 1, 1, 0, { from: account_one });
    await ERC1155.safeTransferFrom(account_two, Mar.address, 1, 1, 0, { from: account_two });
    await Mar.sell(2, my_ether, { from: account_two });
    await ERC20.increaseAllowance(Mar.address, 100, { from: account_one });
    await Mar.make_offer(0, [], ERC20.address, 100, [], { from: account_one, value: 2 });
    const lot = await Mar.proposal_owner.call(account_one, 0, { from: account_one });
    assert.equal(parseInt(lot), 0, "Proposal token not working");
    const balance = await ERC20.balanceOf.call(Mar.address, { from: account_one });
    assert.equal(parseInt(balance), 100, "Proposal token not working");

  });

  it("Make proposal (token + NFT)", async () => {

    await ERC20.mint(account_one, 1000, { from: account_one });
    await ERC1155.mint(account_one, 2, 1, 0, { from: account_one });
    await ERC1155.safeTransferFrom(account_one, Mar.address, 2, 1, 0, { from: account_one });
    await ERC20.increaseAllowance(Mar.address, 100, { from: account_one });
    await Mar.make_offer(0, [3], ERC20.address, 100, [], { from: account_one, value: 2 });
    const lot = await Mar.proposal_owner.call(account_one, 1, { from: account_one });
    assert.equal(parseInt(lot), 1, "Proposal token not working");
    const balance = await ERC20.balanceOf.call(Mar.address, { from: account_one });
    assert.equal(parseInt(balance), 200, "Proposal token not working");


  });

  it("Make proposal (NFT)", async () => {

    await ERC1155.mint(account_one, 3, 1, 0, { from: account_one });
    await ERC1155.safeTransferFrom(account_one, Mar.address, 3, 1, 0, { from: account_one });
    await Mar.make_offer(0, [4], zero_address, 0, [], { from: account_one, value: 2 });
    const lot = await Mar.proposal_owner.call(account_one, 2, { from: account_one });
    assert.equal(parseInt(lot), 2, "Proposal token not working");


  });

  it("Make proposal (crypto + NFT)", async () => {

    await ERC1155.mint(account_one, 5, 1, 0, { from: account_one });
    await ERC1155.safeTransferFrom(account_one, Mar.address, 5, 1, 0, { from: account_one });
    await Mar.make_offer(0, [5], zero_address, 0, [], { from: account_one, value: 5 });
    const lot = await Mar.proposal_owner.call(account_one, 3, { from: account_one });
    assert.equal(parseInt(lot), 3, "Proposal token not working");


  });

  it("Make proposal (crypto)", async () => {

    await Mar.make_offer(0, [], zero_address, 0, [], { from: account_one, value: 5 });
    const lot = await Mar.proposal_owner.call(account_one, 4, { from: account_one });
    assert.equal(parseInt(lot), 4, "Proposal token not working");

  });

  it("Cancel proposal (crypto)", async () => {

    await Mar.cancel_offer(4, { from: account_one});
    const prop = await Mar.proposals.call(4, { from: account_one });
    assert.equal(parseInt(prop.owner), zero_address, "Proposal token not working");

  });

});