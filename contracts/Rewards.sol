pragma solidity >=0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Vesting.sol";

contract Rewards is Ownable {
    using SafeERC20 for IERC20;
    uint256 private constant ACC_PRECISION = 1e24;

    IERC20 public rewardToken;
    IERC20 public OTGToken;
    address public stakingContract;
    Vesting public vestingContract;


    struct Pool {
        uint256 rewardRate;
        uint256 rewardAccPerShare;
        uint256 lastOperationTime;
        uint256 totalStaked;
    }

    struct StakeData {
        uint256 amount;
        uint256 stakeAcc;
    }

    Pool public pool;

    mapping(address => StakeData) public stakes;

    mapping(address => bool) public rewardAdmins;
    mapping(address => bool) public whitelist;

    constructor(address _OTGToken, address _vestingContract){
        OTGToken = IERC20(_OTGToken);
        setVestingContract(_vestingContract);
    }

    modifier isZeroAddress(address _address){
        require(_address != address(0), "is the zero address");
        _;
    }
    modifier onlyRewardAdmin() {
        require(rewardAdmins[msg.sender] || msg.sender == owner(), "Caller is not the owner or admin");
        _;
    }
    modifier onlyWhitelistAdmin() {
        require(whitelist[msg.sender] || msg.sender == owner(), "Caller is not the owner or admin");
        _;
    }

    function getTotalStakes() public view returns(uint256) {
        return pool.totalStaked + vestingContract.totalPassiveStake(); // 6000... from vestingContract
    }

    function doStake(uint256 _amount) external {
        require(_amount > 0, "Invalid stake amount value");

        IERC20(OTGToken).safeTransferFrom(msg.sender, address(this), _amount);

        if (stakes[msg.sender].amount == 0) {
            StakeData memory _stake;
            _stake.amount = _amount;

            // Update pool data
            pool.rewardAccPerShare = getRewardAccumulatedPerShare();
            _stake.stakeAcc = pool.rewardAccPerShare;

            stakes[msg.sender] = _stake;

        } else {
            pool.rewardAccPerShare = getRewardAccumulatedPerShare();
            stakes[msg.sender].stakeAcc = pool.rewardAccPerShare;
            stakes[msg.sender].amount+= _amount;
        }
        pool.totalStaked+= _amount;
        pool.lastOperationTime = block.timestamp;

        //==todo emit
    }


    function unStake(uint256 _amount) external {
        require(stakes[msg.sender].amount >= _amount, "You have no stake with such amount");

        StakeData storage _stake = stakes[msg.sender];

        distributeReward(msg.sender, _stake);
        _stake.amount-= _amount;

        // Return stake
        IERC20(OTGToken).safeTransfer(msg.sender, _amount);

        pool.totalStaked-= _amount;
        pool.lastOperationTime = block.timestamp;

        //==todo emit
    }

    function claimReward() external {
        if(!whitelist[msg.sender]){
            require( stakes[msg.sender].amount > 0, "Your stake is zero");
        }
        StakeData storage _stake = stakes[msg.sender];

        distributeReward(msg.sender, _stake);
        pool.lastOperationTime = block.timestamp;
        //==todo emit
    }

    function distributeReward(
        address _userAddress,
        StakeData storage _stake
    ) private {
        pool.rewardAccPerShare = getRewardAccumulatedPerShare();
        uint256 reward;
        if(whitelist[_userAddress]){

            reward = (_stake.amount + vestingContract.stakerBalance(_userAddress))
            * (pool.rewardAccPerShare - _stake.stakeAcc)
            * pool.rewardRate
            / ACC_PRECISION;

        } else {
            reward = _stake.amount
            * (pool.rewardAccPerShare - _stake.stakeAcc)
            * pool.rewardRate
            / ACC_PRECISION;
        }

        _stake.stakeAcc = pool.rewardAccPerShare;
        IERC20(rewardToken).safeTransfer(_userAddress, reward);



        //==todo emit
    }


    function setPoolState(uint256 _amount) external onlyOwner { //fixatePoolsState + registerLiquidityFee
        require(_amount > 0, "Invalid stake amount value");

        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), _amount);

        pool.rewardRate = _amount / 1 days; //86400
        pool.lastOperationTime = block.timestamp;
    }

    function getRewardAccumulatedPerShare() internal view returns (uint256) {
        uint256 actualTime = block.timestamp;
        if (actualTime <= pool.lastOperationTime || pool.totalStaked == 0) { //!=====
            return pool.rewardAccPerShare;
        }

        return pool.rewardAccPerShare
        + ACC_PRECISION * (actualTime - pool.lastOperationTime) / (getTotalStakes());
    }

    function getStakeRewards(address _userAddress) external view returns (uint256 reward) {
        StakeData memory _stake = stakes[_userAddress];

        if ( getTotalStakes() == 0) {
            return reward;
        }

        reward = (getRewardAccumulatedPerShare() - _stake.stakeAcc)
        * _stake.amount
        * pool.rewardRate
        / ACC_PRECISION;
    }

    function setVestingContract(address _vestingContract) public onlyOwner isZeroAddress(_vestingContract) {
        require(address(_vestingContract) != address(vestingContract), "the address is already set");
        vestingContract = Vesting(_vestingContract);
    }

    function setStakingContract(address _stakingContract) external onlyRewardAdmin isZeroAddress(_stakingContract) {
        require(address(_stakingContract) != address(stakingContract), "the address is already set");
        stakingContract = _stakingContract;
    }

    function updateOTGToken(address _newOTGToken) external onlyOwner isZeroAddress(_newOTGToken) {
        require(address(_newOTGToken) != address(OTGToken), "the address is already set");
        OTGToken = IERC20(_newOTGToken);
    }

    function setRewardToken(address _rewardToken) external onlyRewardAdmin isZeroAddress(_rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }

    function setRewardAdmin(address _address, bool _isAdmin) external onlyOwner isZeroAddress(_address) {
        require(_isAdmin != rewardAdmins[_address], "0");
        rewardAdmins[_address] = _isAdmin;
    }

    function setWhitelistAddress(address _address, bool _isAdmin) external onlyOwner isZeroAddress(_address) {
        require(_isAdmin != whitelist[_address], "0");
        whitelist[_address] = _isAdmin;
    }

}
