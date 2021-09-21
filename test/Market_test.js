const Tokens = artifacts.require("TestERC");
const Market = artifacts.require("NFT_Market");

contract("NFT Exchanger", accounts => {

  const [account_one, account_two, account_three] = accounts;
  let ERC, Mar;

  const [id_one, id_two] = [1, 2];

  const amount = 10;

  before(async () => {
    ERC =  await Tokens.deployed({ from: account_one });
    Mar = await Market.deployed({ from: account_one });
  });

  it("Sell", async () => {
    
    await ERC.setApprovalForAll(Mar.address, true, { from: account_one });
    await ERC.mint(account_one, 1, 1, 0, { from: account_one });
    await Mar.sell(ERC.address, 1, 1, web3.utils.toWei('1', "ether"), 0, { from: account_one });
    await ERC.mint(account_one, 1, 1, 0, { from: account_one });
    await Mar.sell(ERC.address, 1, 1, web3.utils.toWei('1', "ether"), 0, { from: account_one });
    const amount = await Mar.user_sells.call(account_one, 1, { from: account_one });
    assert.equal(parseInt(amount.id), 1, "Sell not working");

});

it("Return token", async () => {

    await Mar.get_back(0, 0, { from: account_one });
    const amount = await Mar.user_sells.call(account_one, 0, { from: account_one });
    assert.equal(parseInt(amount.price), 0, "Sell not working");
    const balance = await ERC.balanceOf.call(account_one, 1, { from: account_one });
    assert.equal(parseInt(balance), 1, "Get back token not working",);

});

it("Buy token", async () => {

    await Mar.buy(account_one, 1, 0, { from: account_two,  value: web3.utils.toWei('1', "ether")});
    const amount = await Mar.user_sells.call(account_one, 1, { from: account_one });
    assert.equal(parseInt(amount.price), 0, "Sell not working");
    const balance = await ERC.balanceOf.call(account_two, 1, { from: account_two });
    assert.equal(parseInt(balance), 1, "Get back token not working",);

});

});