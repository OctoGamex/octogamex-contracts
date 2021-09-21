//SPDX-License-Identifier: none
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestERC is ERC1155{

  constructor () ERC1155('asd') {

  }

  function mint(address account, uint256 id, uint256 amount, bytes memory data) external{
      _mint(account, id, amount, data);
  }

}