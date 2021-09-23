const Tokens = artifacts.require("TestERC");
const Market = artifacts.require("NFT_Market");

contract("NFT Exchanger", accounts => {

  const my_ether = web3.utils.toWei('1', "ether");
  const [account_one, account_two, account_three] = accounts;
  let ERC, Mar;

  const [id_one, id_two] = [1, 2];

  before(async () => {
    ERC =  await Tokens.deployed({ from: account_one });
    Mar = await Market.deployed({ from: account_one });
  });

  it("Add NFT", async () => {
    
    await ERC.mint(account_one, 1, 1, 0, { from: account_one });
    await ERC.mint(account_one, 1, 1, 0, { from: account_one });
    await ERC.safeTransferFrom(account_one, Mar.address, 1, 1, 0, {from: account_one});
    await ERC.safeTransferFrom(account_one, Mar.address, 1, 1, 0, {from: account_one});
    const lot = await Mar.lot_owner.call(account_one, 0, { from: account_one });
    assert.equal(parseInt(lot), 0, "Sell not working");

});

it("Return token", async () => {

    await Mar.get_back(0, 0, { from: account_one });
    const lot = await Mar.lots.call(0, { from: account_one });
    assert.equal(parseInt(lot.id), 0, "Return not working");
    const balance = await ERC.balanceOf.call(account_one, 1, { from: account_one });
    assert.equal(parseInt(balance), 1, "Get back token not working",);

});

it("Sell token", async () => {

  await Mar.sell(1, my_ether, { from: account_one});
  const amount = await Mar.lots.call(1, { from: account_one });
  assert.equal(parseInt(amount.seller_price), my_ether, "Sell not working");
  assert.equal(parseInt(amount.selling), 1, "Sell not working");

});

it("Buy token", async () => {
    const value = await Mar.lots.call(1, { from: account_one });
    await Mar.buy(1, 0, { from: account_two,  value: value.buyer_price});
    const amount = await Mar.lots.call(1, { from: account_two });
    assert.equal(parseInt(amount.buyer_price), 0, "Sell not working");
    const balance = await ERC.balanceOf.call(account_two, 1, { from: account_two });
    assert.equal(parseInt(balance), 1, "Get back token not working",);

});

});