pragma solidity ^0.8.0;

contract Vesting {
    uint256 public totalPassiveStake;
    mapping(address => bool) public stakers;
    mapping(address => uint256) public stakerBalance;

    event newPassiveStacker(
        address userAddress,
        uint256 passiveStakeAmount,
        uint256 timestamp
    );

    event removePassiveStacker(
        address userAddress,
        uint256 unStakeAmount,
        uint256 timestamp
    );

    function setNewStakers(address _address, uint256 _amount) external {
        stakerBalance[_address] = _amount;
        stakers[_address] = true;
        totalPassiveStake += _amount;

        emit newPassiveStacker(_address, _amount, block.timestamp);
    }

    function removeStakers(address _address, uint256 _amount) external {
        require(_amount <= stakerBalance[_address], "amount is too big");

        stakerBalance[_address] -= _amount;
        totalPassiveStake -= _amount;

        if(stakerBalance[_address] == 0){
            stakers[_address] = false;
        }

        emit removePassiveStacker(_address, _amount, block.timestamp);
    }

}
