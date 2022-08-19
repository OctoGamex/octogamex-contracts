pragma solidity >=0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./Vesting.sol";

contract RewardsUpgradeable is Initializable, OwnableUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    uint256 private constant ACC_PRECISION = 1e24;

    address private oracle;
    uint256 public period;

    IERC20Upgradeable public rewardToken;
    IERC20Upgradeable public OTGToken;
    address public stakingContract;
    Vesting public vestingContract;

    struct Pausables {
        bool PauseSetPoolStake;
        bool PauseClaimReward;
        bool PauseDoStake;
        bool PauseUnStake;
    }

    struct Pool {
        uint256 rewardRate;
        uint256 rewardAccPerShare;
        uint256 lastOperationTime;
        uint256 totalStaked;
        uint256 rewardEnd;
        uint256 rewardStart;
    }

    struct StakeData {
        bool active;  //used to check the availability of a staker's reward
        uint256 amount;
        uint256 stakeAcc;
        uint256 rewardPeriod;
        uint256 lastActivePeriod;
    }

    Pool public pool;
    Pausables public pausables;

    mapping(address => StakeData) public stakes;
    mapping(address => bool) public rewardAdmins;

    event stakeEvent(
        address user,
        uint256 amount,
        uint256 time,
        uint256 currentReward,
        uint256 period
    );

    event unStakeEvent(
        address user,
        uint256 amount,
        uint256 time,
        uint256 currentReward,
        uint256 period
    );

    event setPoolEvent(
        uint256 period,
        uint256 time,
        uint256 activeStake,
        uint256 passiveStake,
        uint256 PoolPerDay,
        uint256 rewardEnd
    );

    event claimEvent(
        address user,
        uint256 currentAmount,
        uint256 time,
        uint256 period
    );

    event setStakingEvent(
        address newStakingContract
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _OTGToken, address _rewardToken, address _vestingContract, address _oracle) initializer public {
        __Ownable_init();
        __UUPSUpgradeable_init();

        OTGToken = IERC20Upgradeable(_OTGToken);
        rewardToken = IERC20Upgradeable(_rewardToken);
        vestingContract = Vesting(_vestingContract);
        oracle = _oracle;
    }

    modifier isZeroAddress(address _address){
        require(_address != address(0), "is the zero address");
        _;
    }

    modifier checkContract(address contractAddress) {
        require(AddressUpgradeable.isContract(contractAddress), "It's not contract");
        _;
    }

    modifier onlyRewardAdmin() {
        require(rewardAdmins[msg.sender] || msg.sender == owner(), "Caller is not the owner or admin");
        _;
    }

    function getTotalStakes() public view returns (uint256) {
        return pool.totalStaked + vestingContract.totalPassiveStake();
    }

    function doStake(uint256 _amount) external whenNotPaused {
        require(pausables.PauseDoStake != true, "doStake: paused");
        require(_amount > 0, "Invalid stake amount value");

        IERC20Upgradeable(OTGToken).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 currentReward = getStakeRewards(msg.sender);
        StakeData storage _stake = stakes[msg.sender];

        if (stakes[msg.sender].amount == 0) {
            _stake.amount = _amount;

            // Update pool data
            pool.rewardAccPerShare = getRewardAccumulatedPerShare();
            _stake.stakeAcc = pool.rewardAccPerShare;
        } else {
            pool.rewardAccPerShare = getRewardAccumulatedPerShare();
            _stake.stakeAcc = pool.rewardAccPerShare;
            _stake.amount += _amount;
        }
        pool.totalStaked += _amount;
        pool.lastOperationTime = block.timestamp;

        _stake.active = true;
        _stake.lastActivePeriod = period;
        stakes[msg.sender] = _stake;

        emit stakeEvent(msg.sender, _amount, block.timestamp, currentReward, period);
    }


    function unStake(uint256 _amount) external whenNotPaused {
        require(pausables.PauseUnStake != true, "unStake: paused");
        require(stakes[msg.sender].amount >= _amount, "You have no stake with such amount");

        StakeData storage _stake = stakes[msg.sender];

        uint256 currentReward = getStakeRewards(msg.sender);
        pool.rewardAccPerShare = getRewardAccumulatedPerShare();
        //!=

        _stake.amount -= _amount;

        IERC20Upgradeable(OTGToken).safeTransfer(msg.sender, _amount);
        pool.totalStaked -= _amount;
        pool.lastOperationTime = block.timestamp;

        _stake.stakeAcc = pool.rewardAccPerShare;
        //!=
        _stake.lastActivePeriod = period;
        stakes[msg.sender] = _stake;

        emit unStakeEvent(msg.sender, _amount, block.timestamp, currentReward, period);
    }

    function setPoolState(uint256 _amount) external onlyRewardAdmin whenNotPaused {
        require(pausables.PauseSetPoolStake != true, "setPoolState: paused");
        require(_amount > 0, "Invalid stake amount value");
        require(pool.rewardEnd < block.timestamp, "the previous period has not yet ended");

        IERC20Upgradeable(rewardToken).safeTransferFrom(msg.sender, address(this), _amount);

        pool.rewardStart = block.timestamp - (block.timestamp % 86400);
        pool.rewardEnd = pool.rewardStart + 86400;

        pool.rewardRate = _amount / 1 days;
        //86400
        pool.lastOperationTime = block.timestamp - (block.timestamp - pool.rewardStart);

        period = ++period;

        pool.rewardAccPerShare = 0;
        emit setPoolEvent(period, block.timestamp, pool.totalStaked, vestingContract.totalPassiveStake(), _amount, pool.rewardEnd);
    }
    //            //! for testing
    //    function setPoolState(uint256 _amount) external onlyRewardAdmin {
    //        require(pausables.PauseSetPoolStake != true, "setPoolState: paused");
    //        require(_amount > 0, "Invalid stake amount value");
    //        require(pool.rewardEnd < block.timestamp, "the previous period has not yet ended");
    //
    //        IERC20Upgradeable(rewardToken).safeTransferFrom(msg.sender, address(this), _amount);
    //
    //        pool.rewardEnd = block.timestamp + 300;
    //
    //        pool.rewardRate = _amount / 300; //300
    //
    //        pool.lastOperationTime = block.timestamp;
    //        period = ++period;
    //
    //        pool.rewardAccPerShare = 0;
    //
    //        emit setPoolEvent(period, block.timestamp, pool.totalStaked, vestingContract.totalPassiveStake(), _amount, pool.rewardEnd);
    //    }
    //            //! for testing end

    function getRewardAccumulatedPerShare() internal view returns (uint256) {
        uint256 actualTime = block.timestamp < pool.rewardEnd ? block.timestamp : pool.rewardEnd;

        if (actualTime <= pool.lastOperationTime || getTotalStakes() == 0) {
            return pool.rewardAccPerShare;
        }

        return pool.rewardAccPerShare
        + ACC_PRECISION * (actualTime - pool.lastOperationTime) / (getTotalStakes());
    }

    function getStakeRewards(address _userAddress) public view returns (uint256 reward) {
        StakeData memory _stake = stakes[_userAddress];

        if (getTotalStakes() == 0) {
            return reward;
        }

        if (_stake.lastActivePeriod < period) {
            _stake.stakeAcc = 0;
        }

        if (vestingContract.stakers(_userAddress)) {
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

        IERC20Upgradeable(rewardToken).safeTransfer(_recipient, _amount);
    }

    function setStakingContract(address _stakingContract) external onlyOwner isZeroAddress(_stakingContract) checkContract(_stakingContract) {
        require(address(_stakingContract) != address(stakingContract), "the address is already set");
        stakingContract = _stakingContract;

        emit setStakingEvent(_stakingContract);
    }

    function setRewardAdmin(address _address, bool _isAdmin) external onlyOwner isZeroAddress(_address) {
        require(_isAdmin != rewardAdmins[_address], "0");
        rewardAdmins[_address] = _isAdmin;
    }

    function setPause() public onlyRewardAdmin {
        _pause();
    }

    function unPause() public onlyRewardAdmin {
        if (pausables.PauseSetPoolStake == true) {
            pausables.PauseSetPoolStake = false;
        }

        if (pausables.PauseClaimReward == true) {
            pausables.PauseClaimReward = false;
        }

        if (pausables.PauseUnStake == true) {
            pausables.PauseUnStake = false;
        }

        if (pausables.PauseDoStake == true) {
            pausables.PauseDoStake = false;
        }
        _unpause();
    }

    function setPauseSetPoolStake(bool _isPause) public onlyRewardAdmin whenNotPaused {
        require(pausables.PauseSetPoolStake != _isPause, "invalid _isPause");

        pausables.PauseSetPoolStake = _isPause;
    }

    function setPauseClaimReward(bool _isPause) public onlyRewardAdmin whenNotPaused {
        require(pausables.PauseClaimReward != _isPause, "invalid _isPause");

        pausables.PauseClaimReward = _isPause;
    }

    function setPauseDoStake(bool _isPause) public onlyRewardAdmin whenNotPaused {
        require(pausables.PauseDoStake != _isPause, "invalid _isPause");

        pausables.PauseDoStake = _isPause;
    }

    function setPauseUnStake(bool _isPause) public onlyRewardAdmin whenNotPaused {
        require(pausables.PauseUnStake != _isPause, "invalid _isPause");

        pausables.PauseUnStake = _isPause;
    }

    //    !======== Admin setting END ============

    //    !======= oracle changes START =========

    function claimReward(address _recipient, uint256 _date, uint256 _amount, bytes calldata signature) external whenNotPaused {
        require(pausables.PauseClaimReward != true, "claimReward: paused");

        bytes32 hash = keccak256(abi.encodePacked(_recipient, _date, _amount));
        //??? something more
        require(signerAddress(prefixed(hash), signature) == oracle, "Invalid signature");

        require(vestingContract.stakers(_recipient) || stakes[_recipient].active, 'recipient is not a staker');

        require(stakes[_recipient].rewardPeriod < period, 'reward already been received today');
        stakes[_recipient].rewardPeriod = period;

        uint256 currentAmount = getStakeRewards(_recipient);

        IERC20Upgradeable(rewardToken).safeTransfer(_recipient, currentAmount + _amount);
        stakes[_recipient].stakeAcc = getRewardAccumulatedPerShare();

        if (stakes[_recipient].amount == 0) {
            stakes[_recipient].active = false;
        }

        emit claimEvent(_recipient, currentAmount + _amount, block.timestamp, period);
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

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyOwner
    override
    {}
}
