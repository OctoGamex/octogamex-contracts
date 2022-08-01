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
    const [
        deployer,
        accountOne,
        accountTwo,
        accountThree,
        accountFour,
        accountFive,
        accountSix,
        accountSeven,
        accountEight,
        accountNine
    ] = accounts;

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

        let allStakers = [
            accountOne,
            accountTwo,
            accountThree,
            accountFour,
            accountFive,
            accountSix,
            accountSeven]

        for (let i = 0; i < allStakers.length; i++) {
            const acc = allStakers[i];
            await OTGToken.mint(acc, eth10, { from: deployer });
            await OTGToken.approve(RewardsContractAddress, eth10, { from: acc });

        }

        //? for passive stakers
        await OTGToken.mint(accountEight, eth100, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth100, { from: accountEight });

        await OTGToken.mint(accountNine, eth100, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth100, { from: accountNine });

    });

    // it("set passive stakers --> vestingContract", async () =>  {
    //     let accountEightBalance = await OTGToken.balanceOf(accountEight, { from: accountEight } );
    //     let accountNineBalance = await OTGToken.balanceOf(accountNine, { from: accountNine } );
    //
    //     await VestingContract.setNewStakers(accountEight, accountEightBalance);
    //     await VestingContract.setNewStakers(accountNine, accountNineBalance);
    // });

    it('checking owner and contract balances after calling setPoolState', async () => {
        const balanceOwnerB = await rewardToken.balanceOf(deployer);
        const contractBalanceB = await rewardToken.balanceOf(RewardsContractAddress);

        await rewardToken.approve(RewardsContractAddress, eth100);

        await RewardsContract.setPoolState(eth100);

        const balanceOwnerA = await rewardToken.balanceOf(deployer);
        const contractBalanceA = await rewardToken.balanceOf(RewardsContractAddress);

        //? check balance owner after setPool
        assert.equal(Number(balanceOwnerA), Number(balanceOwnerB) - Number(eth100), "ownerBalance after setPoolState  is wrong");

        //? check balance rewardConteract after setPool
        assert.equal(Number(contractBalanceA), Number(contractBalanceB) + Number(eth100), "contractBalance after setPoolState  is wrong");
    })

    it('doStake for all stakers', async () => {
        let allStakers = [
            accountOne,
            accountTwo,
            accountThree,
            accountFour,
            accountFive,
            accountSix,
            accountSeven
        ];

        for (let i = 0; i < allStakers.length; i++) {
            const acc = allStakers[i];

            await RewardsContract.doStake(eth10, {from: acc})

            let res = await RewardsContract.stakes(acc)
            await time.increase(3600);
            console.log('===============')
            console.log(res.stakeAcc.toLocaleString())
            console.log(res.amount.toLocaleString())
            console.log(res.rewardPeriod.toLocaleString())
            console.log(res.active)
            console.log('===============')

        }
    })

    it('test reward after 86400', async () =>{
        await time.increase(63000);
        await rewardToken.approve(RewardsContractAddress, eth100);

        await RewardsContract.setPoolState(eth100);
        await time.increase(86400);

        let x = await RewardsContract.getStakeRewards(accountOne)
        console.log(x.toLocaleString())
        let a = await RewardsContract.getStakeRewards(accountSeven)
        console.log(a.toLocaleString())
    })
})
