pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC721_prod is ERC721('Octo Test Collection', "OTC"), Ownable {
    uint256 public constant TOTAL_SUPPLY_LIMIT = 1000;

    uint256 public totalSupply;
    string private baseURI;

    constructor (string memory baseURI_) {
        baseURI = baseURI_;
    }

    function mint(address _address) external onlyOwner {
        require(totalSupply < TOTAL_SUPPLY_LIMIT, "Maximum total supply is 1000");

        _mint(_address, totalSupply++);
    }


    function batchMint(address[] calldata _addresses) external onlyOwner {
        require((totalSupply + _addresses.length) <= TOTAL_SUPPLY_LIMIT, "Maximum total supply is 1000");

        for (uint8 i = 0; i < _addresses.length; i++) {
            _mint(_addresses[i], totalSupply + i);
        }
        totalSupply+= _addresses.length;
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
    }

    function _baseURI() internal override  view returns (string memory) {
        return baseURI;
    }

}
