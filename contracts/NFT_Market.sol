//SPDX-License-Identifier: none
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/access/Ownable.sol';


contract NFT_Market is Ownable{

    uint256 immutable public m_comission;

    lot_info [] public lots; 

    mapping(uint256 => address) public lot_owner;
    mapping(address => string) public _token_uri;
    mapping(address => uint8) public all_comission;

    enum type_sell{
        None,
        Fixed_price,
        Auction,
        Exchange
    }

    struct lot_info{
        address contract_add;
        uint256 id;
        uint256 amount;
        type_sell selling; 
        uint256 seller_price;
        uint256 buyer_price;
        uint256 Added;
        uint256 start_auction;
        uint256 end_auction;
        uint256 step;
    }

    event Sell(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount, uint256 price);
    event Buy(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount, uint256 price);
    event return_NFT(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount);

    constructor (uint256 commision){
        m_comission = commision;
    }

    function set_uri(address contract_, string memory uri_) external onlyOwner{
        _token_uri[contract_] = uri_;
    }

    function get_uri(address contract_) external view returns(string memory){
        return _token_uri[contract_];
    }

    function sell(uint256 index, uint256 new_price) external{
        require(lot_owner[index] == msg.sender, "You are not the owner!");
        lots[index].seller_price = new_price;
        lots[index].buyer_price = new_price + (new_price * m_comission) / 100;
        lots[index].selling = type_sell.Fixed_price;
    }

    function get_back (uint256 index, bytes memory data_) external {
        lot_info memory lot = lots[index];
        require(lot_owner[index] == msg.sender, "You are not the owner!");
        ERC1155 nft_contract = ERC1155(lot.contract_add);
        delete lots[index];
        nft_contract.safeTransferFrom(address(this), msg.sender, lot.id, lot.amount, data_);
        emit return_NFT(lot.contract_add, lot.id, msg.sender, lot.amount);
    }

    function buy (uint256 index, bytes memory data_) payable external {
        lot_info memory lot = lots[index];
        require(lot.buyer_price == msg.value && lot_owner[index] != msg.sender, "Not enough payment");
        delete lots[index];
        ERC1155 nft_contract = ERC1155(lot.contract_add);
        nft_contract.safeTransferFrom(address(this), msg.sender, lot.id, lot.amount, data_);
        payable(lot_owner[index]).send(lot.seller_price);
        emit Buy(lot.contract_add, lot.id, msg.sender, lot.amount, lot.buyer_price);
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4){
        lots.push(
            lot_info(
                msg.sender, 
                id, 
                value, 
                type_sell.None,
                0,
                0,
                block.timestamp,
                0,
                0,
                0
            ));
        lot_owner[lots.length] = operator;
        //emit Sell(contract_, ID_, msg.sender, amount_, price_);
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