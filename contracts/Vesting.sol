pragma solidity ^0.8.0;

contract Vesting {
    uint256 public totalPassiveStake;
    mapping(address => bool) public stakers;
    mapping(address => uint256) public stakerBalance;

    function setNewStakers(address _address, uint256 _amount) external {
            stakerBalance[_address] = _amount;
            stakers[_address] = true;
            totalPassiveStake += _amount;
    }

}
