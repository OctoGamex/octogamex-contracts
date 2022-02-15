pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ERC1155_prod is ERC1155, Ownable {
    uint256 public totalSupply;
    string  public baseURI;

    mapping(uint256 => bool) private tokenIdList;

    constructor () ERC1155('asd') {

    }

    function mint(address _account, uint256 _id, uint256 _amount, bytes memory data) external onlyOwner{
        require(totalSupply < 1500, "more than 1500");

        _mint(_account, _id, _amount, data);
        totalSupply = totalSupply + _amount;
        tokenIdList[_id] = true;
    }

    function mintBatch(address[] calldata _address, uint256[] calldata _id, uint256[] calldata _amount, bytes memory data) external onlyOwner {
        require(_address.length == _id.length && _id.length == _amount.length, "arrays must be the same length");
        require(totalSupply < 1500, "more than 1500");

        for (uint i; i < _address.length; i++){
            _mint(_address[i], _id[i], _amount[i], "");
            totalSupply = totalSupply + _amount[i];
            tokenIdList[_id[i]] = true;
        }
    }

    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return tokenIdList[tokenId];
    }


    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
    }

    function tokenURI(uint256 tokenId) external view virtual returns (string memory) {
        require(_exists(tokenId), "ERC1155Metadata: URI query for non existent token");

        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, Strings.toString(tokenId))) : "";
    }

}
