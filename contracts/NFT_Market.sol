//SPDX-License-Identifier: none
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/access/Ownable.sol';


contract NFT_Market is Ownable{

    mapping(address => lot_sell [] ) public user_sells; // user address - contract address - ID - amount
    mapping(address => string) private _token_uri;

    struct lot_sell{
        address contract_add;
        uint256 id;
        uint256 amount;
        uint256 price;
    }

    event Sell(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount, uint256 price);
    event Buy(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount, uint256 price);
    event return_NFT(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount);

    constructor (){
    }

    function set_uri(address contract_, string memory uri_) external onlyOwner{
        _token_uri[contract_] = uri_;
    }

    function get_uri(address contract_) external view returns(string memory){
        return _token_uri[contract_];
    }

    function sell (address contract_, uint256 ID_, uint256 amount_, uint256 price_, bytes memory data_) external {
        ERC1155 nft_contract = ERC1155(contract_);
        nft_contract.safeTransferFrom(msg.sender, address(this), ID_, amount_, data_);
        user_sells[msg.sender].push(lot_sell(contract_, ID_, amount_, price_));
        emit Sell(contract_, ID_, msg.sender, amount_, price_);
    }

    function get_back (uint256 lot_, bytes memory data_) external {
        lot_sell memory lot_info = user_sells[msg.sender][lot_];
        ERC1155 nft_contract = ERC1155(lot_info.contract_add);
        delete user_sells[msg.sender][lot_];
        nft_contract.safeTransferFrom(address(this), msg.sender, lot_info.id, lot_info.amount, data_);
        emit return_NFT(lot_info.contract_add, lot_info.id, msg.sender, lot_info.amount);
    }

    function buy (address owner_, uint256 lot_, bytes memory data_) payable external {
        lot_sell memory lot_info = user_sells[owner_][lot_];
        require(lot_info.price == msg.value , "Not enough payment");
        delete user_sells[owner_][lot_];
        ERC1155 nft_contract = ERC1155(lot_info.contract_add);
        nft_contract.safeTransferFrom(address(this), msg.sender, lot_info.id, lot_info.amount, data_);
        payable(owner_).send(lot_info.price);
        emit Buy(lot_info.contract_add, lot_info.id, msg.sender, lot_info.amount, lot_info.price);
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure returns (bytes4){
      return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure returns (bytes4){
      return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }
}