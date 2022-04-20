//SPDX-License-Identifier: none
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20{

  constructor () ERC20("Octo Test Token", "OCT") {

  }

  function mint(address account,uint256 amount) external{
      _mint(account, amount);
  }

}
