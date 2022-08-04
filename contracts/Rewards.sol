pragma solidity >=0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Vesting.sol";

contract Rewards is Ownable {
    using SafeERC20 for IERC20;
    uint256 private constant ACC_PRECISION = 1e24;

    address private oracle;
    uint256 public period;

    IERC20 public rewardToken;
    IERC20 public OTGToken;
    address public stakingContract;
    Vesting public vestingContract;

    struct Pool {
        uint256 rewardRate;
        uint256 rewardAccPerShare;
        uint256 lastOperationTime;
        uint256 totalStaked;
        uint256 rewardEnd;
        uint256 rewardStart;
    }
    struct StakeData {
        bool active;
        uint256 amount;
        uint256 stakeAcc;
        uint256 rewardPeriod;
    }

    Pool public pool;

    mapping(address => StakeData) public stakes;
    mapping(address => bool) public rewardAdmins;

    event stakeEvent(
        address user,
        uint256 amount,
        uint256 time
    );

    event unStakeEvent(
        address user,
        uint256 amount,
        uint256 time,
        uint256 currentReward
    );

    event setPoolEvent(
        uint256 period,
        uint256 time,
        uint256 activeStake,
        uint256 passiveStake,
        uint256 PoolPerDay

    );

    event claimEvent(
        address user,
        uint256 currentAmount,
        uint256 time
    );

    event setVestingEvent(
        address newVestingContract
    );

    event setStakingEvent(
        address newStakingContract
    );

    event setRewardTokenEvent(
        address newRewardToken
    );

    constructor(address _OTGToken, address _vestingContract, address _oracle){
        require(_oracle != address(0x0), "Invalid oracle address");

        OTGToken = IERC20(_OTGToken);
        setVestingContract(_vestingContract);
        oracle = _oracle;
    }

    modifier isZeroAddress(address _address){
        require(_address != address(0), "is the zero address");
        _;
    }

    modifier onlyRewardAdmin() {
        require(rewardAdmins[msg.sender] || msg.sender == owner(), "Caller is not the owner or admin");
        _;
    }

    function getTotalStakes() public view returns(uint256) {
        return pool.totalStaked + vestingContract.totalPassiveStake();
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

        stakes[msg.sender].active = true;

        emit stakeEvent(msg.sender, _amount, block.timestamp);
    }


    function unStake(uint256 _amount) external {
        require(stakes[msg.sender].amount >= _amount, "You have no stake with such amount");

        StakeData storage _stake = stakes[msg.sender];

        uint256 currentReward = getStakeRewards(msg.sender);

        _stake.amount-= _amount;

        IERC20(OTGToken).safeTransfer(msg.sender, _amount);
        pool.totalStaked-= _amount;
        pool.lastOperationTime = block.timestamp;
        stakes[msg.sender].stakeAcc = pool.rewardAccPerShare;//!=

        pool.rewardAccPerShare = getRewardAccumulatedPerShare(); //!=

        emit unStakeEvent(msg.sender, _amount, block.timestamp, currentReward);
    }

    function setPoolState(uint256 _amount) external onlyRewardAdmin {
        require(_amount > 0, "Invalid stake amount value");

        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), _amount);

        pool.rewardStart = block.timestamp - (block.timestamp % 86400);
        pool.rewardEnd =  pool.rewardStart + 86400;

        pool.rewardRate = _amount / 1 days; //86400
        pool.lastOperationTime = block.timestamp - (block.timestamp - pool.rewardStart);

        period = ++period;

        emit setPoolEvent(period, block.timestamp, pool.totalStaked, vestingContract.totalPassiveStake(), _amount);
    }
//            //! for testing
//    function setPoolState(uint256 _amount) external onlyRewardAdmin {
//        require(_amount > 0, "Invalid stake amount value");
//
//        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), _amount);
//
//        pool.rewardEnd =  block.timestamp + 300;
//
//        pool.rewardEnd = block.timestamp + 300;
//
//        pool.rewardRate = _amount / 300; //300
//        pool.lastOperationTime = block.timestamp;
//        period = ++period;
//
//        emit setPoolEvent(period, block.timestamp, pool.totalStaked, vestingContract.totalPassiveStake(), _amount);
//    }
//            //! for testing end

    function getRewardAccumulatedPerShare() internal view returns (uint256) {
        uint256 actualTime = block.timestamp < pool.rewardEnd ? block.timestamp : pool.rewardEnd;

        if (actualTime <= pool.lastOperationTime || pool.totalStaked == 0) {
            return pool.rewardAccPerShare;
        }

        return pool.rewardAccPerShare
        + ACC_PRECISION * (actualTime - pool.lastOperationTime) / (getTotalStakes());
    }

    function getStakeRewards(address _userAddress) public view returns (uint256 reward) {
        StakeData memory _stake = stakes[_userAddress];

        if ( getTotalStakes() == 0) {
            return reward;
        }

        if(vestingContract.stakers(_userAddress)){
            reward = (_stake.amount + vestingContract.stakerBalance(_userAddress))
            * (getRewardAccumulatedPerShare() - _stake.stakeAcc)
            * pool.rewardRate
            / ACC_PRECISION;

        } else {
            reward = _stake.amount
            * (getRewardAccumulatedPerShare() - _stake.stakeAcc)
            * pool.rewardRate
            / ACC_PRECISION;
        }

    }

//    !======== Admin setting START ==========
    function withdrawalForOwner(address _recipient, uint256 _amount) public onlyOwner {
        require(_amount > 0, "Invalid amount value");

        IERC20(rewardToken).safeTransfer(_recipient, _amount);
    }

    function setVestingContract(address _vestingContract) public onlyOwner isZeroAddress(_vestingContract) {
        require(address(_vestingContract) != address(vestingContract), "the address is already set");
        vestingContract = Vesting(_vestingContract);

        emit setVestingEvent(_vestingContract);
    }

    function setStakingContract(address _stakingContract) external onlyOwner isZeroAddress(_stakingContract) {
        require(address(_stakingContract) != address(stakingContract), "the address is already set");
        stakingContract = _stakingContract;

        emit setStakingEvent(_stakingContract);
    }

    function updateOTGToken(address _newOTGToken) external onlyOwner isZeroAddress(_newOTGToken) {
        require(address(_newOTGToken) != address(OTGToken), "the address is already set");
        OTGToken = IERC20(_newOTGToken);
    }

    function setRewardToken(address _rewardToken) external onlyOwner isZeroAddress(_rewardToken) {
        rewardToken = IERC20(_rewardToken);

        emit setRewardTokenEvent(_rewardToken);
    }

    function setRewardAdmin(address _address, bool _isAdmin) external onlyOwner isZeroAddress(_address) {
        require(_isAdmin != rewardAdmins[_address], "0");
        rewardAdmins[_address] = _isAdmin;
    }

//    !======== Admin setting END ============

//    !======= oracle changes START =========

    function claimReward(address _recipient, uint256 _date, uint256 _amount, bytes calldata signature) external {
        bytes32 hash = keccak256(abi.encodePacked(_recipient, _date, _amount)); //??? something more
        require(signerAddress(prefixed(hash), signature) == oracle, "Invalid signature");

        require(vestingContract.stakers(_recipient) || stakes[_recipient].active, 'recipient is not a staker');

        require(stakes[_recipient].rewardPeriod < period, 'reward already been received today');
        stakes[_recipient].rewardPeriod = period;

//        IERC20(rewardToken).safeTransfer(_recipient, _amount);

        uint256 currentAmount = getStakeRewards(_recipient);

        IERC20(rewardToken).safeTransfer(_recipient, currentAmount + _amount);

        if(stakes[_recipient].amount == 0){
            stakes[_recipient].active = false;
        }

        emit claimEvent(_recipient, currentAmount, block.timestamp);
    }



    function splitSign(bytes memory sig) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(sig.length == 65);

        assembly {
            r := mload(add(sig, 32)) // first 32 bytes, after the length prefix
            s := mload(add(sig, 64)) // second 32 bytes
            v := mload(add(sig, 65)) // final byte (first byte of the next 32 bytes)
        }
    }

    function signerAddress(bytes32 message, bytes memory sig) internal pure returns (address) {
        (uint8 v, bytes32 r, bytes32 s) = splitSign(sig);

        return ecrecover(message, v, r, s);
    }

    /**
     * Builds a prefixed hash to mimic the behavior of eth_sign function.
     */
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    /**
     * Changes oracle address.
     *
     * @param _oracle Address of the oracle (may be a contract or a regular address).
   */
    function changeOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0x0), "Invalid oracle address");
        require(oracle != _oracle, "Address already registered");

        //todo emit

        oracle = _oracle;
    }
    //    !======= oracle changes END =========
//        function claimReward(address _recipient, uint256 _date, uint256 _amount, bytes calldata signature) external view returns(address) {
//        require(_amount > 0, "Invalid amount value");
//        bytes32 hash = keccak256(abi.encodePacked(_recipient, _date, _amount));
//
//        //==todo emit
//            return signerAddress(prefixed(hash), signature);
//
//    }
}
