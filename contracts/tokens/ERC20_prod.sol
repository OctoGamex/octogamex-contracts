//SPDX-License-Identifier: none
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20_prod is ERC20, Ownable{

    constructor () ERC20("Octo Test Token", "OCT") {

    }

    function mint(address account,uint256 amount) external onlyOwner{
        _mint(account, amount);
    }

    function batchMint(address[] calldata _addresses, uint256[] calldata _amounts) external onlyOwner {
        require(_addresses.length == _amounts.length, "Arrays must be the same length");

        for (uint8 i = 0; i < _addresses.length; i++) {
            _mint(_addresses[i], _amounts[i]);
        }

    }

}
