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
    let eth1, eth5, eth10, eth100,eth500, eth100000;

    let signMessage;

    before(async () => {
        OTGToken = await Tokens.new({from: deployer});
        rewardToken = await Tokens.new({from: deployer});

        OTGTokenAddress = OTGToken.address;
        rewardTokenAddress = rewardToken.address;

        VestingContract = await Vesting.new({from: deployer});
        VestingContractAddress = VestingContract.address;

        RewardsContract = await Rewards.new(OTGTokenAddress, rewardTokenAddress, VestingContractAddress, '0x598511d4087b3F48B270De0FEC4bb930faB0A98c', {from: deployer});
        RewardsContractAddress = RewardsContract.address;

        // RewardsContract.setRewardToken(rewardTokenAddress);

        const tokenbits = (new BN(10)).pow(new BN(18));
        eth1 = new BN(1).mul(tokenbits);
        eth5 = new BN(5).mul(tokenbits);
        eth10 = new BN(10).mul(tokenbits);
        eth100 = new BN(100).mul(tokenbits);
        eth500 = new BN(500).mul(tokenbits);
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
            await OTGToken.mint(acc, eth100, { from: deployer });
            await OTGToken.approve(RewardsContractAddress, eth100, { from: acc });

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

    it('setPoolState 1th (100eth)', async () => {
        await rewardToken.approve(RewardsContractAddress, eth500);
        await RewardsContract.setPoolState(eth500);
    })

    it('doStake', async () => {
        console.log('=================================================')

        await RewardsContract.doStake(eth10, {from: accountOne})

        await time.increase(150);
        let x = await RewardsContract.getStakeRewards(accountOne)
        console.log('before unstake', Number(x.toLocaleString()) / 10**18)
        await RewardsContract.unStake(eth5, {from: accountOne});
        await RewardsContract.doStake(eth10, {from: accountTwo})

        let d = await RewardsContract.pool()
        console.log("totalStaked pool 0.5 day", d.totalStaked.toLocaleString())
        console.log('=================================================')
    })

    it('reward check at the end of the day', async () =>{
        // let yw = await RewardsContract.getStakeRewards(accountOne)
        // console.log('111', Number(yw.toLocaleString()) / 10**18)
        // await RewardsContract.unStake(eth5, {from: accountOne});
        // let e = await RewardsContract.getStakeRewards(accountOne)
        // console.log('2222', Number(e.toLocaleString()) / 10**18)

        console.log('=================================================')
        await time.increase(150);

        let x = await RewardsContract.getStakeRewards(accountOne)
        console.log('reward at the end day accountOne', Number(x.toLocaleString()) / 10**18)

        let y = await RewardsContract.getStakeRewards(accountTwo)
        console.log('reward at the end day accountTwo', Number(y.toLocaleString()) / 10**18)

        console.log('=================================================')
    })

    // it('setPoolState 2th (100eth)', async () => {
    //     await rewardToken.approve(RewardsContractAddress, eth100);
    //     await RewardsContract.setPoolState(eth100);
    // })
    //
    // it('day #2', async () =>{
    //     // console.log('=================================================')
    //     // // await RewardsContract.doStake(eth10, {from: accountOne})
    //     await time.increase(300);
    //     // //
    //     // //
    //     // //
    //     // let xx = await RewardsContract.getStakeRewards(accountOne)
    //     // console.log('before unstake 2', Number(xx.toLocaleString()) / 10**18)
    //     // await RewardsContract.unStake(eth1, {from: accountOne})
    //     // await time.increase(150);
    //     let x = await RewardsContract.getStakeRewards(accountOne)
    //     console.log('reward at the end day accountOne 2', Number(x.toLocaleString()) / 10**18)
    //     // await time.increase(1);
    //     //
    //     let y = await RewardsContract.getStakeRewards(accountTwo)
    //     console.log('reward at the end day accountTwo 2', Number(y.toLocaleString()) / 10**18)
    //
    //
    //
    //     console.log('=================================================')
    // })
    //
    //
    // it('test oracle function', async () => {
    //     const dateNow = await time.latest(time.latest());
    //     signMessage = await oracleSign.sign(accountOne, BigInt(dateNow), BigInt(eth1));
    //
    //
    //     console.log('======================')
    //     const balanceAccountOneBefore = await rewardToken.balanceOf(accountOne);
    //     console.log(balanceAccountOneBefore.toLocaleString(), 'before balance')
    //
    //     let addressOracle = await RewardsContract.claimReward(accountOne, BigInt(dateNow), BigInt(eth1), signMessage, {from: accountOne})
    //     // await RewardsContract.unStake(eth5, {from: accountOne})
    //
    //     const balanceAccountOneAfter = await rewardToken.balanceOf(accountOne);
    //     console.log(balanceAccountOneAfter.toLocaleString(),  'before After')
    //
    //     // console.log(addressOracle)
    // })

    // it('setPoolState 3th (100eth)', async () => {
    //     await rewardToken.approve(RewardsContractAddress, eth100);
    //     await RewardsContract.setPoolState(eth100);
    // })
    //
    // it('day #3', async () =>{
    //     console.log('=================================================')
    //     await time.increase(300);
    //
    //     let x = await RewardsContract.getStakeRewards(accountOne)
    //     console.log('reward at the end day accountOne 3', Number(x.toLocaleString()) / 10**18)
    //     // await time.increase(1);
    //     //
    //     let y = await RewardsContract.getStakeRewards(accountTwo)
    //     console.log('reward at the end day accountTwo 3', Number(y.toLocaleString()) / 10**18)
    //
    //
    //
    //     console.log('=================================================')
    // })


})
