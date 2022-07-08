const Vesting = artifacts.require("Vesting");
const Rewards = artifacts.require("Rewards");

const Tokens = artifacts.require("TestERC20");

// const {
//     BN,
//     expectEvent,
//     expectRevert,
//     time,
//     constants
// } = require('@openzeppelin/test-helpers');

contract('staking functionality', async accounts => {
    const [deployer, accountOne, accountTwo, accountThree, accountFour] = accounts;

    let OTGToken, rewardToken, VestingContract, RewardsContract;
    let OTGTokenAddress, rewardTokenAddress, VestingContractAddress, RewardsContractAddress;

    before(async () => {
        OTGToken = await Tokens.new({from: deployer});
        rewardToken = await Tokens.new({from: deployer});

        OTGTokenAddress = OTGToken.address
        rewardTokenAddress = rewardToken.address

        VestingContract = await Vesting.deployed({from: deployer})
        VestingContractAddress = VestingContract.address

        Rewards.deployed(OTGTokenAddress, VestingContractAddress, {from: deployer})
    })

    it("first test from reward for test", async () => {
        console.log(27746613)
    });
})
