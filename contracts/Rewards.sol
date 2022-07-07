pragma solidity >=0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; //?====???

contract Rewards is Ownable {

    IERC20 public rewardToken;
    IERC20 public OTGToken;
    address public stakingContract;
    address public vestingContract;

    mapping(address => bool) public rewardAdmins;
    mapping(address => bool) public whitelistAdmins;

    constructor(address _OTGToken, address _vestingContract){
        OTGToken = IERC20(_OTGToken);
        vestingContract = _vestingContract;
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
        require(whitelistAdmins[msg.sender] || msg.sender == owner(), "Caller is not the owner or admin");
        _;
    }

    function setVestingContract(address _vestingContract) external onlyOwner isZeroAddress(_vestingContract) {
        require(address(_vestingContract) != address(vestingContract), "the address is already set");
        vestingContract = _vestingContract;
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
    function setWhitelistAdmins(address _address, bool _isAdmin) external onlyOwner isZeroAddress(_address) {
        require(_isAdmin != whitelistAdmins[_address], "0");
        whitelistAdmins[_address] = _isAdmin;
    }

}
