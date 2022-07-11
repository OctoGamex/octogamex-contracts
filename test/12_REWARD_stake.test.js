const Vesting = artifacts.require("Vesting");
const Rewards = artifacts.require("Rewards");

const Tokens = artifacts.require("TestERC20");

const {
    BN,
    expectEvent,
    expectRevert,
    time,
    constants
} = require('@openzeppelin/test-helpers');

contract('staking functionality', async accounts => {
    const [deployer, accountOne, accountTwo, accountThree, accountFour] = accounts;

    let OTGToken, rewardToken, VestingContract, RewardsContract;
    let OTGTokenAddress, rewardTokenAddress, VestingContractAddress, RewardsContractAddress;
    let eth5, eth10, eth100;

    before(async () => {
        OTGToken = await Tokens.new({from: deployer});
        rewardToken = await Tokens.new({from: deployer});

        OTGTokenAddress = OTGToken.address;
        rewardTokenAddress = rewardToken.address;

        VestingContract = await Vesting.new({from: deployer});
        VestingContractAddress = VestingContract.address;

        RewardsContract = await Rewards.new(OTGTokenAddress, VestingContractAddress, {from: deployer});
        RewardsContractAddress = RewardsContract.address;

        RewardsContract.setRewardToken(rewardTokenAddress);

        const tokenbits = (new BN(10)).pow(new BN(18));
        eth5 = new BN(5).mul(tokenbits);
        eth10 = new BN(10).mul(tokenbits);
        eth100 = new BN(100).mul(tokenbits);

    })

    it("mint & approve tokens for users", async () => {
        await rewardToken.mint(deployer, eth100);

        await OTGToken.mint(accountOne, eth10, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth10, { from: accountOne });

        await OTGToken.mint(accountTwo, eth10, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth10, { from: accountTwo });

        await OTGToken.mint(accountThree, eth100, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth100, { from: accountThree });

        await OTGToken.mint(accountFour, eth100, { from: deployer });
        await OTGToken.approve(RewardsContractAddress, eth100, { from: accountFour });

    });

    it("vestingContract", async () =>  {
        let accTwoNFTBalance = await OTGToken.balanceOf(accountThree, { from: accountThree } );
        let accTwoNFTBalance2 = await OTGToken.balanceOf(accountFour, { from: accountFour } );

        await VestingContract.setNewStakers(accountThree, accTwoNFTBalance);
        await VestingContract.setNewStakers(accountFour, accTwoNFTBalance2);

        //? temporarily to synchronize data with the Vesting contract
        await RewardsContract.setWhitelistAdmins(accountThree, true);
        await RewardsContract.setWhitelistAdmins(accountFour, true);
    });

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

    it('testing function unStake', async () => {
        const balanceAccOneBefore = await OTGToken.balanceOf(accountOne);
        const stakeAmountBefore  = await RewardsContract.stakes(accountOne);
        const beforeBalance = await RewardsContract.getTotalStakes();

        await RewardsContract.unStake(eth5, {from: accountOne});

        const balanceAccOneAfter = await OTGToken.balanceOf(accountOne);
        const stakeAmountAfter  = await RewardsContract.stakes(accountOne);
        const afterBalance= await RewardsContract.getTotalStakes();


        assert.equal(Number(balanceAccOneAfter),Number(balanceAccOneBefore) + Number(eth5) ,'balanceOf  accountOne is wrong, after unStake');
        assert.equal(Number(stakeAmountAfter.amount), Number(stakeAmountBefore.amount) - Number(eth5),"stake's amount is wrong, after unStake");
        assert.equal(Number(afterBalance), Number(beforeBalance) - Number(eth5), "total stake amount of contract is wrong");
    })
})
