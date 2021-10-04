//SPDX-License-Identifier: MIT

pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is Ownable {
    uint8 public market_comission; // Market comission in persents
    uint256 public offer_comission; // Fixed comission for create proposition

    address public Market_wallet; // Address for transfer comission

    lot_info[] public lots; // array of NFT lot
    offer[] public offers; // array of offers to lots

    mapping(address => uint256[]) public lot_owner; // mapping user address to array of index lots created by user
    mapping(address => uint256[]) public offer_owner; // mapping user address to array of index offer created by user
    mapping(uint256 => uint256[]) public lot_offer; // mapping index lot => array of index offers

    enum lot_type {
        None,
        FixedPrice,
        Auction,
        Exchange
    } // lot type

    struct lot_info {
        lot_start creation_info;
        lot_type selling;
        currency price;
        auction_info auction;
        bool offered; // added to offer
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

    struct offer {
        address owner; // created by
        uint256 lot_id;
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
    event Reverted_Offer(uint256 indexed offer_id, uint256 indexed datetime); // ???   uint256 indexed lot_id

    constructor(
        uint8 comission,
        uint256 proposal_comission,
        address wallet
    ) {
        set_market_comission(comission);
        set_offer_comission(proposal_comission);
        set_wallet(wallet);
    }

    function set_market_comission(uint8 comission) public onlyOwner {
        //TODO: if comission should be grater than zero - add require

        market_comission = comission;
    }

    function set_offer_comission(uint256 comission) public onlyOwner {
        //TODO: if comission should be grater than zero - add require

        offer_comission = comission;
    }

    function set_wallet(address new_wallet) public onlyOwner {
        require(new_wallet != address(0x0) && new_wallet != Market_wallet, "Invalid market address");

        Market_wallet = new_wallet;
    }

    // add nft to contract
    function add(
        address l_contract, //TODO: call variables with understandable names
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
                currency(address(0x0), 0, 0),
                auction_info(0, 0, 0, address(0x0)),
                false
            )
        ); // add lot to array
        lot_owner[msg.sender].push(lots.length - 1); // add lot id to owner array
        emit Add_NFT(
            msg.sender,
            l_contract,
            id,
            lots.length - 1,
            block.timestamp
        );
    }

    // set lot sell
    function sell(
        uint256 index,
        address t_contract,
        uint256 new_price
    ) external {
        require(
            lots[index].creation_info.owner == msg.sender &&
                lots[index].offered == false, // user must be owner and not added to offer
            "You are not the owner!(sell)"
        );
        lots[index].price.seller_price =
            new_price -
            (new_price * market_comission) /
            100; // set value what send to seller
        lots[index].price.buyer_price = new_price; // set value what send buyer
        lots[index].price.contract_add = t_contract;
        lots[index].selling = lot_type.FixedPrice;
        emit Sell_NFT(
            msg.sender,
            lots[index].creation_info.id,
            block.timestamp
        );
    }

    function get_back(uint256 index, bytes memory data_) public {
        return_nft(index, msg.sender, data_);
    }

    function return_nft(
        uint256 index,
        address user,
        bytes memory data_
    ) internal {
        lot_info memory lot = lots[index];
        require(
            lot.creation_info.owner == user,
            "You are not the owner!(get_back)"
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
        require(lot.selling == lot_type.FixedPrice, "Not enough payment");
        delete lots[index];
        if (lot.price.contract_add == address(0)) {
            // buy by crypto
            payable(lot.creation_info.owner).transfer(lot.price.seller_price);
            payable(Market_wallet).transfer(
                lot.price.buyer_price - lot.price.seller_price
            );
        } else {
            // buy by tokens
            ERC20 token_contract = ERC20(lot.price.contract_add);
            token_contract.transferFrom(
                msg.sender,
                lot.creation_info.owner,
                lot.price.seller_price
            );
            token_contract.transferFrom(
                msg.sender,
                Market_wallet,
                lot.price.buyer_price - lot.price.seller_price
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
        // create offer
        require(
            msg.value >= offer_comission &&
                lots[index].creation_info.contract_add != address(0) &&
                lots[index].selling != lot_type.None,
            "You not send comission or lot not valid"
        );
        if (msg.value == offer_comission) {
            if (lot_index.length == 0) {
                // token
                ERC20 token_contract = ERC20(token_address);
                token_contract.transferFrom(msg.sender, address(this), payment);
                offers.push(
                    offer(
                        msg.sender,
                        index,
                        lot_index,
                        currency(
                            token_address,
                            payment - (payment * market_comission) / 100,
                            payment
                        )
                    )
                );
            } else {
                for (uint256 i = 0; i < lot_index.length; i++) {
                    require(
                        lots[lot_index[i]].creation_info.owner == msg.sender &&
                            lot_index[i] != index &&
                            lots[lot_index[i]].offered == false,
                        "You are not the owner or wrong lot"
                    );
                    lots[lot_index[i]].offered = true;
                }
                if (token_address != address(0)) {
                    // nft + token
                    ERC20 token_contract = ERC20(token_address);
                    token_contract.transferFrom(
                        msg.sender,
                        address(this),
                        payment
                    );
                    offers.push(
                        offer(
                            msg.sender,
                            index,
                            lot_index,
                            currency(
                                token_address,
                                payment - (payment * market_comission) / 100,
                                payment
                            )
                        )
                    );
                } else {
                    //nft
                    offers.push(
                        offer(
                            msg.sender,
                            index,
                            lot_index,
                            currency(address(0), 0, 0)
                        )
                    );
                }
            }
        } else {
            if (lot_index.length != 0) {
                // crypto with nft
                offers.push(
                    offer(
                        msg.sender,
                        index,
                        lot_index,
                        currency(
                            address(0),
                            (msg.value - offer_comission) -
                                (msg.value * market_comission) /
                                100,
                            msg.value
                        )
                    )
                );
            } else {
                // crypto
                offers.push(
                    offer(
                        msg.sender,
                        index,
                        lot_index,
                        currency(
                            address(0),
                            (msg.value - offer_comission) -
                                ((msg.value - offer_comission) *
                                    market_comission) /
                                100,
                            msg.value
                        )
                    )
                );
            }
        }
        offer_owner[msg.sender].push(offers.length - 1);
        lot_offer[index].push(offers.length - 1);
        emit Make_Offer(index, offers.length - 1, block.timestamp);
    }

    function cancel_offer(uint256 index) external {
        require(
            offers[index].owner == msg.sender,
            "You are not the owner!(cancel offer)"
        );
        offer memory l_proposal = offers[index];
        delete offers[index];
        if (l_proposal.crypto_proposal.contract_add == address(0)) {
            if (l_proposal.crypto_proposal.buyer_price == 0) {
                payable(l_proposal.owner).transfer(offer_comission);
            } else {
                payable(l_proposal.owner).transfer(
                    l_proposal.crypto_proposal.buyer_price
                );
            }
        } else {
            payable(l_proposal.owner).transfer(offer_comission);
            ERC20 token_contract = ERC20(
                l_proposal.crypto_proposal.contract_add
            );
            token_contract.transfer(
                l_proposal.owner,
                l_proposal.crypto_proposal.buyer_price
            );
        }
        if (l_proposal.lots_prop.length != 0) {
            for (uint256 i = 0; i < l_proposal.lots_prop.length; i++) {
                return_nft(l_proposal.lots_prop[i], msg.sender, "");
            }
        }
        emit Reverted_Offer(index, block.timestamp);
    }

    function choose_offer(
        uint256 lot_id,
        uint256 offer_id,
        bytes memory data
    ) external {
        require(
            lots[lot_id].creation_info.owner == msg.sender &&
                offers[offer_id].lot_id == lot_id,
            "You are not owner"
        );
        lot_info memory lot = lots[lot_id];
        delete lots[lot_id];
        ERC1155 nft_contract = ERC1155(lot.creation_info.contract_add);
        nft_contract.safeTransferFrom(
            address(this),
            offers[offer_id].owner,
            lot.creation_info.id,
            lot.creation_info.amount,
            data
        );
        offer memory user_proposal = offers[offer_id];
        delete offers[offer_id];
        if (user_proposal.lots_prop.length != 0) {
            // NFT
            for (uint256 i = 0; i < user_proposal.lots_prop.length; i++) {
                lot_info memory prop_lot = lots[user_proposal.lots_prop[i]];
                nft_contract = ERC1155(prop_lot.creation_info.contract_add);
                delete lots[user_proposal.lots_prop[i]];
                nft_contract.safeTransferFrom(
                    address(this),
                    lot.creation_info.owner,
                    prop_lot.creation_info.id,
                    prop_lot.creation_info.amount,
                    data
                );
            }
        }
        if (user_proposal.crypto_proposal.contract_add == address(0)) {
            // crypto
            if (user_proposal.crypto_proposal.seller_price != 0) {
                payable(lot.creation_info.owner).transfer(
                    user_proposal.crypto_proposal.seller_price
                );
                payable(Market_wallet).transfer(
                    user_proposal.crypto_proposal.buyer_price -
                        user_proposal.crypto_proposal.seller_price -
                        market_comission
                );
            } else {
                payable(Market_wallet).transfer(market_comission);
            }
        } else {
            // token
            ERC20 token_contract = ERC20(
                user_proposal.crypto_proposal.contract_add
            );
            token_contract.transfer(
                lot.creation_info.owner,
                user_proposal.crypto_proposal.seller_price
            );
        }
        emit Choosed_Offer(lot_id, offer_id, block.timestamp);
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
            emit Add_NFT(
                operator,
                msg.sender,
                id,
                lots.length - 1,
                block.timestamp
            );
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
