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
    const [deployer, accountOne, accountTwo, accountThree, accountFour, mockStakingAddress] = accounts;

    let OTGToken, rewardToken, VestingContract, RewardsContract;
    let OTGTokenAddress, rewardTokenAddress, VestingContractAddress, RewardsContractAddress;
    let zeroAddress;

    before(async () => {
        zeroAddress = '0x0000000000000000000000000000000000000000';
        OTGToken = await Tokens.new({from: deployer});
        rewardToken = await Tokens.new({from: deployer});

        OTGTokenAddress = OTGToken.address;
        rewardTokenAddress = rewardToken.address;

        VestingContract = await Vesting.new({from: deployer});
        VestingContractAddress = VestingContract.address;

        RewardsContract = await Rewards.new(OTGTokenAddress, VestingContractAddress, {from: deployer});
        RewardsContractAddress = RewardsContract.address;

        // RewardsContract.setRewardToken(rewardTokenAddress);
    })

    it("check possibility of adding rewardAdmin", async () => {
        let isAdmin = true;
        await RewardsContract.setRewardAdmin(accountOne, isAdmin, { from: deployer });

        let isRewardAdmin = await RewardsContract.rewardAdmins(accountOne, { from: deployer });
        assert.equal(isRewardAdmin, isAdmin, "address is not added as reward admin");
    });

    it("expect revert if owner try to re-adding reward-admin", async () => {
        let isAdmin = true;
        await expectRevert(
            RewardsContract.setRewardAdmin(accountOne, isAdmin, { from: deployer }),
            "0"
        );
    });

    it("check possibility of set  setRewardToken", async () =>{
        await RewardsContract.setRewardToken(rewardTokenAddress, {from: accountOne});

       await expectRevert(RewardsContract.setRewardToken(rewardTokenAddress, {from: accountTwo}), "Caller is not the owner or admin");
       await expectRevert(RewardsContract.setRewardToken(zeroAddress, {from: accountOne}), "is the zero address");
       assert.equal(await RewardsContract.rewardToken(), rewardTokenAddress, "rewardTokenAddress is not updated" )
    })

    it("check possibility of set  setStakingContract", async () =>{
        await RewardsContract.setStakingContract(mockStakingAddress, {from: accountOne});

        await expectRevert(RewardsContract.setStakingContract(mockStakingAddress, {from: accountTwo}), "Caller is not the owner or admin");
        await expectRevert(RewardsContract.setStakingContract(zeroAddress, {from: accountOne}), "is the zero address");
        assert.equal(await RewardsContract.stakingContract(), mockStakingAddress, "stakingContract is not updated" )
    })

})
