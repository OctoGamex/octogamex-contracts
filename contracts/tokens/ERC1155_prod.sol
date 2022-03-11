pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ERC1155_prod is ERC1155, Ownable {
    uint256 public constant TOTAL_SUPPLY_LIMIT = 1500;
    string public name = "Octo Test Collection";
    string public symbol = "OTC";

    uint256 public totalSupply;
    string public baseURI;

    mapping(uint256 => bool) private tokenIdList;

    constructor (string memory uri_) ERC1155(uri_) {

    }

    function mint(address _account, uint256 _id, uint256 _amount, bytes memory data) external onlyOwner{
        require((totalSupply + _amount) <= TOTAL_SUPPLY_LIMIT, "Maximum total supply is 1500");

        _mint(_account, _id, _amount, data);
        totalSupply = totalSupply + _amount;
        tokenIdList[_id] = true;
    }

    function batchMint(address[] calldata _addresses, uint256[] calldata _ids, uint256[] calldata _amounts, bytes memory data) external onlyOwner {
        require(_addresses.length == _ids.length && _ids.length == _amounts.length, "Arrays must be the same length");

        for (uint8 i = 0; i < _addresses.length; i++) {
            if (totalSupply + _amounts[i] > TOTAL_SUPPLY_LIMIT) {
                break;
            }

            _mint(_addresses[i], _ids[i], _amounts[i], data);
            totalSupply+= _amounts[i];
            tokenIdList[_ids[i]] = true;
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
