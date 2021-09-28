//SPDX-License-Identifier: none
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT_Market is Ownable {
    uint8 public m_comission; // Market comission in persent
    uint8 public prop_comission; // Fixed comission for create proposition

    address public Market_wallet; // Address for transfer comision

    lot_info[] public lots; // array of NFT lot
    proposal[] public proposals; // array of proposals to lots

    mapping(address => uint256[]) public lot_owner; // mapping user address to array of index lots created by user
    mapping(address => uint256[]) public proposal_owner; // mapping user address to array of index proposal created by user
    mapping(uint256 => uint256[]) public lot_prop; // mapping index lot => array of index proposals
    mapping(address => string) public _token_uri; // smart-contract => API
    mapping(address => uint8) public all_comission; // address => comission

    enum lot_type {
        None,
        Fixed_price,
        Auction,
        Exchange
    } // lot type

    struct lot_info {
        lot_start creation_info;
        lot_type selling;
        currency price;
        auction_info auction;
        bool can_proposal;
    } // information about lot

    struct lot_start {
        address owner; // created by
        address contract_add; // contract address
        uint256 id; // NFT id
        uint256 amount;
        uint256 Added; // date when NFT added to contract
    }

    struct auction_info {
        uint256 start_auction;
        uint256 end_auction;
        uint256 step;
        address last_bid;
    }

    struct currency {
        address contract_add; // contract address
        uint256 seller_price; // amount what take seller
        uint256 buyer_price; // price for buyer
    }

    struct proposal {
        address owner; // created by
        uint256[] lots_prop; // array of lot index
        currency crypto_proposal;
    }

    event Add_NFT(
        address user,
        address contract_address,
        uint256 NFT_id,
        uint256 lot_id,
        uint256 datetime
    );
    event Sell_NFT(
        address indexed user,
        uint256 indexed lot_id,
        uint256 indexed datetime
    );
    event Buy_NFT(
        address indexed user,
        uint256 indexed lot_id,
        uint256 indexed datetime
    );
    event Get_Back(uint256 indexed lot_id, uint256 indexed datetime);
    event Make_Offer(
        uint256 indexed lot_id,
        uint256 indexed offer_id,
        uint256 indexed datetime
    );
    event Choosed_Offer(
        uint256 indexed lot_id,
        uint256 indexed offer_id,
        uint256 indexed datetime
    );
    event Reverted_Offer(uint256 indexed offer_id, uint256 indexed datetime); // ???   uint256 indexed lot_id,

    constructor(
        uint8 comission,
        uint8 proposal_comission,
        address wallet
    ) {
        set_market_com(comission);
        set_proposal_com(proposal_comission);
        set_wallet(wallet);
    }

    function set_market_com(uint8 comission) public onlyOwner {
        m_comission = comission;
    }

    function set_proposal_com(uint8 comission) public onlyOwner {
        prop_comission = comission;
    }

    function set_wallet(address new_wallet) public onlyOwner {
        Market_wallet = new_wallet;
    }

    function set_uri(address contract_, string memory uri_) external onlyOwner {
        _token_uri[contract_] = uri_;
    }

    function get_uri(address contract_) external view returns (string memory) {
        return _token_uri[contract_];
    }

    function add(
        address l_contract,
        uint256 id,
        uint256 value,
        bytes memory data_
    ) external {
        ERC1155 nft_contract = ERC1155(l_contract);
        nft_contract.safeTransferFrom(
            msg.sender,
            address(this),
            id,
            value,
            data_
        );
        lots.push(
            lot_info(
                lot_start(msg.sender, l_contract, id, value, block.timestamp),
                lot_type.None,
                currency(address(0), 0, 0),
                auction_info(0, 0, 0, address(0)),
                false
            )
        );
        lot_owner[msg.sender].push(lots.length - 1);
        emit Add_NFT(
            msg.sender,
            l_contract,
            id,
            lots.length - 1,
            block.timestamp
        );
    }

    function sell(
        uint256 index,
        address t_contract,
        uint256 new_price
    ) external {
        require(
            lots[index].creation_info.owner == msg.sender,
            "You are not the owner!"
        );
        lots[index].price.seller_price =
            new_price -
            (new_price * m_comission) /
            100;
        lots[index].price.buyer_price = new_price;
        lots[index].price.contract_add = t_contract;
        lots[index].selling = lot_type.Fixed_price;
        emit Sell_NFT(
            msg.sender,
            lots[index].creation_info.id,
            block.timestamp
        );
    }

    function get_back(uint256 index, bytes memory data_) public {
        lot_info memory lot = lots[index];
        require(
            lot.creation_info.owner == msg.sender,
            "You are not the owner!"
        );
        ERC1155 nft_contract = ERC1155(lot.creation_info.contract_add);
        delete lots[index];
        nft_contract.safeTransferFrom(
            address(this),
            lot.creation_info.owner,
            lot.creation_info.id,
            lot.creation_info.amount,
            data_
        );
        emit Get_Back(lot.creation_info.id, block.timestamp);
    }

    function buy(uint256 index, bytes memory data_) external payable {
        lot_info memory lot = lots[index];
        require(
            lot.creation_info.owner != msg.sender &&
                lot.selling == lot_type.Fixed_price,
            "Not enough payment"
        );
        delete lots[index];
        if (lot.price.contract_add == address(0)) {
            payable(lot.creation_info.owner).transfer(lot.price.seller_price);
        } else {
            ERC20 token_contract = ERC20(lot.price.contract_add);
            token_contract.transferFrom(
                msg.sender,
                lot.creation_info.owner,
                lot.price.seller_price
            );
        }
        ERC1155 nft_contract = ERC1155(lot.creation_info.contract_add);
        nft_contract.safeTransferFrom(
            address(this),
            msg.sender,
            lot.creation_info.id,
            lot.creation_info.amount,
            data_
        );
        emit Buy_NFT(msg.sender, lot.creation_info.id, block.timestamp);
    }

    function make_offer(
        uint256 index,
        uint256[] memory lot_index,
        address token_address,
        uint256 payment,
        bytes memory data_
    ) external payable {
        require(lots[index].creation_info.owner != msg.sender, "You are owner");
        if (msg.value == prop_comission) {
            if (lot_index.length == 0) {
                // token
                ERC20 token_contract = ERC20(token_address);
                token_contract.transferFrom(msg.sender, address(this), payment);
                proposals.push(
                    proposal(
                        msg.sender,
                        lot_index,
                        currency(
                            token_address,
                            payment - (payment * m_comission) / 100,
                            payment
                        )
                    )
                );
            } else {
                for (uint256 i = 0; i < lot_index.length; i++) {
                    require(
                        lots[lot_index[i]].creation_info.owner == msg.sender,
                        "You are not the owner"
                    );
                }
                if (payment != 0) {
                    // nft + token
                    ERC20 token_contract = ERC20(token_address);
                    token_contract.transferFrom(
                        msg.sender,
                        address(this),
                        payment
                    );
                    proposals.push(
                        proposal(
                            msg.sender,
                            lot_index,
                            currency(
                                token_address,
                                payment - (payment * m_comission) / 100,
                                payment
                            )
                        )
                    );
                } else {
                    //nft
                    proposals.push(
                        proposal(
                            msg.sender,
                            lot_index,
                            currency(address(0), 0, 0)
                        )
                    );
                }
            }
        } else {
            if (lot_index.length == 0) {
                // crypto
                proposals.push(
                    proposal(
                        msg.sender,
                        lot_index,
                        currency(
                            address(0),
                            msg.value - prop_comission,
                            msg.value
                        )
                    )
                );
            } else {
                //crypto and nft with payment
                for (uint256 i = 0; i < lot_index.length; i++) {
                    require(
                        lots[lot_index[i]].creation_info.owner == msg.sender,
                        "You are not the owner"
                    );
                }
                proposals.push(
                    proposal(
                        msg.sender,
                        lot_index,
                        currency(
                            address(0),
                            msg.value - prop_comission,
                            msg.value
                        )
                    )
                );
            }
        }
        proposal_owner[msg.sender].push(proposals.length - 1);
        lot_prop[index].push(proposals.length - 1);
        emit Make_Offer(index, proposals.length - 1, block.timestamp);
    }

    function cancel_offer(uint256 index) external {
        require(proposals[index].owner == msg.sender, "You are not the owner!");
        proposal memory l_proposal = proposals[index];
        delete proposals[index];
        if (l_proposal.lots_prop.length == 0) {
            if (l_proposal.crypto_proposal.contract_add == address(0)) {
                payable(l_proposal.owner).transfer(
                    l_proposal.crypto_proposal.buyer_price
                );
            } else {
                payable(l_proposal.owner).transfer(prop_comission);
                ERC20 token_contract = ERC20(
                    l_proposal.crypto_proposal.contract_add
                );
                token_contract.transfer(
                    l_proposal.owner,
                    l_proposal.crypto_proposal.buyer_price
                );
            }
        } else {
            if (l_proposal.crypto_proposal.contract_add == address(0)) {
                if (l_proposal.crypto_proposal.buyer_price == 0) {
                    payable(l_proposal.owner).transfer(prop_comission);
                } else {
                    payable(l_proposal.owner).transfer(
                        l_proposal.crypto_proposal.buyer_price
                    );
                }
            } else {
                payable(l_proposal.owner).transfer(prop_comission);
                ERC20 token_contract = ERC20(
                    l_proposal.crypto_proposal.contract_add
                );
                token_contract.transfer(
                    l_proposal.owner,
                    l_proposal.crypto_proposal.buyer_price
                );
            }
            for (uint256 i = 0; i < l_proposal.lots_prop.length; i++) {
                get_back(l_proposal.lots_prop[i], "");
            }
        }
        emit Reverted_Offer(index, block.timestamp);
    }

    function get_lots(uint256[] memory indexes)
        external
        view
        returns (lot_info[] memory)
    {
        lot_info[] memory get_lot;
        for (uint256 i = 0; i < indexes.length; i++) {
            get_lot[i] = lots[indexes[i]];
        }
        return get_lot;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4) {
        if (operator != address(this)) {
            lots.push(
                lot_info(
                    lot_start(operator, msg.sender, id, value, block.timestamp),
                    lot_type.None,
                    currency(address(0), 0, 0),
                    auction_info(0, 0, 0, address(0)),
                    false
                )
            );
            lot_owner[operator].push(lots.length - 1);
            emit Add_NFT(operator, msg.sender, id, lots.length - 1, block.timestamp);
        }
        return
            bytes4(
                keccak256(
                    "onERC1155Received(address,address,uint256,uint256,bytes)"
                )
            );
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure returns (bytes4) {
        return
            bytes4(
                keccak256(
                    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"
                )
            );
    }
}
