//SPDX-License-Identifier: none
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/access/Ownable.sol';


contract NFT_Market is Ownable{

    uint8 immutable public m_comission;
    uint8 public prop_comission;

    lot_info [] public lots; 
    proposal [] public proposals;

    mapping(address => uint256 []) public lot_owner;
    mapping(address => uint256 []) public proposal_owner;
    mapping(address => string) public _token_uri;
    mapping(address => uint8) public all_comission;
    address [] public erc20_address;

    enum type_sell{
        None,
        Fixed_price,
        Auction,
        Exchange
    }

    struct lot_info{
        address owner;
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
        bool can_proposal;
    }

    struct currency{
        address id_contract;
        uint256 seller_price;
        uint256 buyer_price;
    }

    struct proposal{
        address owner;
        uint256 [] lots_prop;
        currency crypto_proposal;
    }

    event Sell(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount, uint256 price);
    event Buy(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount, uint256 price);
    event return_NFT(address indexed nft_contranct, uint256 indexed ID, address indexed user, uint256  amount);

    constructor (uint8 commision){
        m_comission = commision;
    }

    function set_uri(address contract_, string memory uri_) external onlyOwner{
        _token_uri[contract_] = uri_;
    }

    function get_uri(address contract_) external view returns(string memory){
        return _token_uri[contract_];
    }

    function sell(uint256 index, uint256 new_price) external{
        require(lots[index].owner == msg.sender, "You are not the owner!");
        lots[index].seller_price = new_price;
        lots[index].buyer_price = new_price + (new_price * m_comission) / 100;
        lots[index].selling = type_sell.Fixed_price;
        emit Sell(lots[index].contract_add, lots[index].id, msg.sender, lots[index].amount, lots[index].buyer_price);
    }

    function get_back (uint256 index, bytes memory data_) external {
        lot_info memory lot = lots[index];
        require(lot.owner == msg.sender, "You are not the owner!");
        ERC1155 nft_contract = ERC1155(lot.contract_add);
        delete lots[index];
        nft_contract.safeTransferFrom(address(this), msg.sender, lot.id, lot.amount, data_);
        emit return_NFT(lot.contract_add, lot.id, msg.sender, lot.amount);
    }

    function buy (uint256 index, bytes memory data_) payable external {
        lot_info memory lot = lots[index];
        require(lot.buyer_price == msg.value && lot.owner != msg.sender && lot.selling == type_sell.Fixed_price, "Not enough payment");
        delete lots[index];
        ERC1155 nft_contract = ERC1155(lot.contract_add);
        nft_contract.safeTransferFrom(address(this), msg.sender, lot.id, lot.amount, data_);
        payable(lot.owner).transfer(lot.seller_price);
        emit Buy(lot.contract_add, lot.id, msg.sender, lot.amount, lot.buyer_price);
    }

    function make_offer (uint256 index, uint256 [] memory lot_index, uint256 token_index, uint256 payment, bytes [] memory data_) external payable {
        require(lots[index].owner != msg.sender, "You are owner" );
        if (msg.value == prop_comission && lot_index.length == 0 && payment != 0){ //only tokens
            proposals.push(
                proposal(
                    msg.sender,
                    lot_index,
                    currency(    
                        erc20_address[token_index],                
                        payment - payment * m_comission / 100,
                        payment
                    )
            ));
            proposal_owner[msg.sender].push(proposals.length - 1);
        } else if(msg.value > prop_comission && lot_index.length != 0 && payment == 0) {  //crypto and nft with payment
            for (uint256 i=0; i < lot_index.length; i++){
                require(lots[i].owner == msg.sender, "You are not the owner");
            }
            proposals.push(
                proposal(
                    msg.sender,
                    lot_index,
                    currency(    
                        address(0),                
                        msg.value - msg.value * m_comission / 100,
                        msg.value
                    )
            ));
            proposal_owner[msg.sender].push(proposals.length - 1);
        } else if (msg.value == prop_comission && lot_index.length != 0 && payment == 0) { // nft
            for (uint256 i=0; i < lot_index.length; i++){
                require(lots[i].owner == msg.sender, "You are not the owner");
            }
            proposals.push(
                proposal(
                    msg.sender,
                    lot_index,
                    currency(    
                        address(0),                
                        0,
                        0
                    )
            ));
            proposal_owner[msg.sender].push(proposals.length - 1);
        } else if (msg.value > prop_comission && lot_index.length == 0 && payment == 0) { // crypto
            proposals.push(
                proposal(
                    msg.sender,
                    lot_index,
                    currency(    
                        address(0),                
                        msg.value - msg.value * m_comission / 100,
                        msg.value
                    )
            ));
            proposal_owner[msg.sender].push(proposals.length - 1);
        } else if (msg.value == prop_comission && lot_index.length != 0 && payment != 0) { // nft + token  
            for (uint256 i=0; i < lot_index.length; i++){
                require(lots[i].owner == msg.sender, "You are not the owner");
            }
            proposals.push(
                proposal(
                    msg.sender,
                    lot_index,
                    currency(    
                        erc20_address[token_index],                
                        payment - payment * m_comission / 100,
                        payment
                    )
            ));
            proposal_owner[msg.sender].push(proposals.length - 1);
        } else {
            revert("Wrong parametr");
        }
    }

    // function cancel_offer (uint256 index) external {
    //     require(proposals[index].owner == msg.sender, "You are not the owner!" );
    //     proposal l_proposal = proposals[index];
    //     if (l_proposal.nft_props.length == 0) {

    //     } else {

    //     }
    // }

    // function get_lots(uint256 [] indexes) external view returns(lot_info []) {
    //     for (uint256 i = 0; i < indexes.length, )
    // }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4){
        lots.push(
            lot_info(
                operator,
                msg.sender, 
                id, 
                value, 
                type_sell.None,
                0,
                0,
                block.timestamp,
                0,
                0,
                0,
                false
            ));
        lot_owner[operator].push(lots.length - 1);
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