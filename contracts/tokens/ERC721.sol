//SPDX-License-Identifier: none
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721{

  constructor () ERC721('asd', "asd") {

  }

  function mint(address account, uint256 id) external{
      _mint(account, id);
  }

}