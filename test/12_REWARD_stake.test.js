const Vesting = artifacts.require("Vesting");
const Rewards = artifacts.require("Rewards");

const Tokens = artifacts.require("TestERC20");
const oracleSign = require("../utils/sign.js");


const {
    BN,
    expectEvent,
    expectRevert,
    time,
    constants
} = require('@openzeppelin/test-helpers');

contract('staking functionality', async accounts => {
    const [deployer, accountOne, accountTwo, accountThree, accountFour, accountFive] = accounts;

    let OTGToken, rewardToken, VestingContract, RewardsContract;
    let OTGTokenAddress, rewardTokenAddress, VestingContractAddress, RewardsContractAddress;
    let eth5, eth10, eth100, eth100000;

    let signMessage;

    before(async () => {
        OTGToken = await Tokens.new({from: deployer});
        rewardToken = await Tokens.new({from: deployer});

        OTGTokenAddress = OTGToken.address;
        rewardTokenAddress = rewardToken.address;

        VestingContract = await Vesting.new({from: deployer});
        VestingContractAddress = VestingContract.address;

        RewardsContract = await Rewards.new(OTGTokenAddress, VestingContractAddress, '0x598511d4087b3F48B270De0FEC4bb930faB0A98c', {from: deployer});
        RewardsContractAddress = RewardsContract.address;

        RewardsContract.setRewardToken(rewardTokenAddress);

        const tokenbits = (new BN(10)).pow(new BN(18));
        eth5 = new BN(5).mul(tokenbits);
        eth10 = new BN(10).mul(tokenbits);
        eth100 = new BN(100).mul(tokenbits);
        eth100000 = new BN(100000).mul(tokenbits);

    })

    it("mint & approve tokens for users", async () => {
        await rewardToken.mint(deployer, eth100000);

        await OTGToken.mint(accountOne, eth10, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth10, { from: accountOne });

        await OTGToken.mint(accountTwo, eth10, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth10, { from: accountTwo });

        await OTGToken.mint(accountThree, eth100, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth100, { from: accountThree });

        await OTGToken.mint(accountFour, eth100, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth100, { from: accountFour });

    });

    // it("vestingContract", async () =>  {
    //     let accTwoNFTBalance = await OTGToken.balanceOf(accountThree, { from: accountThree } );
    //     let accTwoNFTBalance2 = await OTGToken.balanceOf(accountFour, { from: accountFour } );
    //
    //     await VestingContract.setNewStakers(accountThree, accTwoNFTBalance);
    //     await VestingContract.setNewStakers(accountFour, accTwoNFTBalance2);
    // });

    // it('expect revert if caller is not the owner or amount value is Invalid', async () => {
    //     await expectRevert(RewardsContract.setPoolState(eth5, {from: accountOne}), "Ownable: caller is not the owner");
    //     await expectRevert(RewardsContract.setPoolState(0), "Invalid stake amount value");
    // })
    //

    it('checking owner and contract balances after calling setPoolState', async () => {
        const balanceOwnerB = await rewardToken.balanceOf(deployer);
        const contractBalanceB = await rewardToken.balanceOf(RewardsContractAddress);

        await rewardToken.approve(RewardsContractAddress, eth100);

        await RewardsContract.setPoolState(eth100);
        let xx = await RewardsContract.period()
        console.log(xx.toLocaleString(), '0000')

        const balanceOwnerA = await rewardToken.balanceOf(deployer);
        const contractBalanceA = await rewardToken.balanceOf(RewardsContractAddress);

        assert.equal(Number(balanceOwnerA), Number(balanceOwnerB) - Number(eth100), "ownerBalance after setPoolState  is wrong");
        assert.equal(Number(contractBalanceA), Number(contractBalanceB) + Number(eth100), "contractBalance after setPoolState  is wrong");
        const pool = await RewardsContract.pool();
        assert.equal(Number(pool.rewardRate), Math.trunc(Number(eth100) / 86400), "pool.rewardRate is wrong" );
    })

    it('testing function doStake', async () => {
        const balanceAccOneBefore = await OTGToken.balanceOf(accountOne);
        const beforeBalance = await RewardsContract.getTotalStakes();
        const amountStakeOfAccountOneB = await RewardsContract.stakes(accountOne);

        await RewardsContract.doStake(eth10, {from: accountOne})

        const balanceAccOneAfter = await OTGToken.balanceOf(accountOne);
        const afterBalance= await RewardsContract.getTotalStakes();
        const amountStakeOfAccountOneA = await RewardsContract.stakes(accountOne);

        assert.equal(Number(balanceAccOneAfter), Number(balanceAccOneBefore) - eth10, "balance is wrong");
        assert.equal(Number(afterBalance), Number(beforeBalance) + Number(eth10), "total stake amount of contract is wrong");
        assert.equal(Number(amountStakeOfAccountOneA.amount), Number(amountStakeOfAccountOneB.amount) + Number(eth10), "stake's amount is wrong");
    })

    it('expect revert if stakes[msg.sender].amount < 0, function claimReward', async () => {
        // await expectRevert( RewardsContract.claimReward({from: accountFive}), "Your stake is zero");
        await time.increase(86400);


        let x = await RewardsContract.getStakeRewards(accountOne)
        console.log(x.toLocaleString() / 10**18, 'прибуток за перший день (accountOne)')
    })


    it('2th setPool', async () => {
        await rewardToken.approve(RewardsContractAddress, eth100);
        await RewardsContract.setPoolState(eth100);
        let a = await RewardsContract.period()
        console.log(a.toLocaleString(), '000000')
        await RewardsContract.doStake(eth10, {from: accountTwo})
        await time.increase(86400);

        let x = await RewardsContract.getStakeRewards(accountOne, {from: accountOne})
        let x2 = await RewardsContract.getStakeRewards(accountTwo, {from: accountTwo})


        console.log(x.toLocaleString() / 10**18, 'прибуток за другий день (accountOne)')
        console.log(x2.toLocaleString() / 10**18,  'прибуток за другий день (accountTwo)')

    })

    it('testing unStake', async ()=>{

        const b = await OTGToken.balanceOf(accountOne);
        console.log(b.toLocaleString(), '000')
        await RewardsContract.unStake(eth10, {from: accountOne})
        const a = await OTGToken.balanceOf(accountOne);
        console.log(a.toLocaleString(), '111')
    })

    // it('test oracle function', async () => {
    //     const dateNow = await time.latest(time.latest());
    //     signMessage = await oracleSign.sign(accountOne, BigInt(dateNow), BigInt(eth5));
    //
    //
    //     console.log('======================')
    //     const balanceAccountOneBefore = await rewardToken.balanceOf(accountOne);
    //     console.log(balanceAccountOneBefore.toLocaleString(), 'before balance')
    //
    //   let addressOracle = await RewardsContract.claimReward(accountOne, BigInt(dateNow), BigInt(eth5), signMessage, {from: accountOne})
    //   // let addressOracle2 = await RewardsContract.claimReward(accountOne, BigInt(dateNow), BigInt(eth5), signMessage, {from: accountOne})
    //
    //     const balanceAccountOneAfter = await rewardToken.balanceOf(accountOne);
    //     console.log(balanceAccountOneAfter.toLocaleString(),  'before After')
    //
    //     // console.log(addressOracle)
    // })

    //
    //
    // it('testing function unStake', async () => {
    //     const balanceAccOneBefore = await OTGToken.balanceOf(accountOne);
    //     const stakeAmountBefore  = await RewardsContract.stakes(accountOne);
    //     const beforeBalance = await RewardsContract.getTotalStakes();
    //
    //     await RewardsContract.unStake(eth5, {from: accountOne});
    //
    //     const balanceAccOneAfter = await OTGToken.balanceOf(accountOne);
    //     const stakeAmountAfter  = await RewardsContract.stakes(accountOne);
    //     const afterBalance= await RewardsContract.getTotalStakes();
    //
    //
    //     assert.equal(Number(balanceAccOneAfter),Number(balanceAccOneBefore) + Number(eth5) ,'balanceOf  accountOne is wrong, after unStake');
    //     assert.equal(Number(stakeAmountAfter.amount), Number(stakeAmountBefore.amount) - Number(eth5),"stake's amount is wrong, after unStake");
    //     assert.equal(Number(afterBalance), Number(beforeBalance) - Number(eth5), "total stake amount of contract is wrong");
    // })
})
