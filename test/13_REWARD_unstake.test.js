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
    let eth5, eth10, eth100,eth500, eth100000;

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
        await rewardToken.approve(RewardsContractAddress, eth100);
        await RewardsContract.setPoolState(eth100);
    })

    it('doStake', async () => {
        console.log('=================================================')

        console.log('make stake from accountOne (10 eth)')
        await RewardsContract.doStake(eth10, {from: accountOne})

        console.log('make stake from accountTwo (10 eth)')
        await time.increase(150);
        await RewardsContract.doStake(eth10, {from: accountTwo})

        let d = await RewardsContract.pool()
        console.log("totalStaked pool", d.totalStaked.toLocaleString())

        console.log('=================================================')
    })

    it('reward check at the end of the day', async () =>{
        console.log('=================================================')
        await time.increase(150);
        console.log('missed time 230')

        let x = await RewardsContract.getStakeRewards(accountOne)
        console.log('reward at the end day accountOne', Number(x.toLocaleString()) / 10**18)

        let y = await RewardsContract.getStakeRewards(accountTwo)
        console.log('reward at the end day accountTwo', Number(y.toLocaleString()) / 10**18)


        // console.log('робимо unStake на eth5')
        // await RewardsContract.unStake(eth5, {from: accountOne}) //цей момент потрібно десь збергігати прибуток (на бек)
        console.log('=================================================')
    })

    it('setPoolState 2th (100eth)', async () => {
        await rewardToken.approve(RewardsContractAddress, eth100);
        await RewardsContract.setPoolState(eth100);
    })

    it('day #2', async () =>{
        console.log('=================================================')
        // await RewardsContract.doStake(eth10, {from: accountOne})
        await time.increase(300);


        let x = await RewardsContract.getStakeRewards(accountOne)
        console.log('reward at the end day accountOne 2', Number(x.toLocaleString()) / 10**18)

        let y = await RewardsContract.getStakeRewards(accountTwo)
        console.log('reward at the end day accountTwo 2', Number(y.toLocaleString()) / 10**18)
        // await time.increase(1000);
        //
        // let x = await RewardsContract.getStakeRewards(accountOne)
        // console.log('винагорода кінець першого дня 1', Number(x.toLocaleString()) / 10**18)
        // let y = await RewardsContract.getStakeRewards(accountTwo)
        // console.log('винагорода кінець першого дня 2', Number(y.toLocaleString()) / 10**18)
        console.log('=================================================')
    })
    //
    // it('new setPOOl №1', async () =>{
    //
    //
    //     await rewardToken.approve(RewardsContractAddress, eth100);
    //     await RewardsContract.setPoolState(eth100);
    //     await time.increase(300);
    //
    //     let x = await RewardsContract.getStakeRewards(accountOne)
    //     let y = await RewardsContract.getStakeRewards(accountTwo)
    //     console.log('винагорода кінец 2', Number(x.toLocaleString()))
    //     console.log('винагорода кінец 2 акк2', Number(y.toLocaleString()))
    //
    // })
    //
    // it('new setPOOl №2', async () =>{
    //
    //
    //     await rewardToken.approve(RewardsContractAddress, eth100);
    //     await RewardsContract.setPoolState(eth100);
    //     await time.increase(300);
    //
    //     let x = await RewardsContract.getStakeRewards(accountOne)
    //     let y = await RewardsContract.getStakeRewards(accountTwo)
    //     console.log('винагорода кінец 3', Number(x.toLocaleString()) / 10**18)
    //     console.log('винагорода кінец 2 акк2', Number(y.toLocaleString()) / 10**18)
    //
    // })

})
