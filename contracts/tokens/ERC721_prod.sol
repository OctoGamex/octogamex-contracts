pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC721_prod is ERC721, Ownable {
    uint256 public totalSupply;
    string public baseURI;

    constructor () ERC721('asd', "asd") {

    }

    function mint(address _address) external onlyOwner {
        require(totalSupply < 1000, "more than 1000");

        _mint(_address, totalSupply + 1);
        totalSupply++;
    }


    function batchMint(address[] calldata _address) external onlyOwner {
        require(totalSupply < 1000, "more than 1000");

        for (uint i; i < _address.length; i++) {
            _mint(_address[i], totalSupply + 1);

            totalSupply++;
        }
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
    }

    function _baseURI() internal override  view returns (string memory) {
        return baseURI;
    }

}
