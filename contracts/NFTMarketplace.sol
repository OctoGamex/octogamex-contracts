//SPDX-License-Identifier: MIT

pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is Ownable {
    uint8 public marketComission; // Market comission in persents
    uint256 public offerComission; // Fixed comission for create proposition

    address public marketWallet; // Address for transfer comission

    lotInfo[] public lots; // array of NFT lot
    offer[] public offers; // array of offers to lots

    mapping(address => uint256[]) public lotOwner; // mapping user address to array of index lots created by user
    mapping(address => uint256[]) public offerOwner; // mapping user address to array of index offer created by user
    mapping(uint256 => uint256[]) public lotOffers; // mapping index lot => array of index offers

    enum lotType {
        None,
        FixedPrice,
        Auction,
        Exchange
    } // lot type

    struct lotInfo {
        lotStart creationInfo;
        lotType selling;
        uint256 sellStart;
        currency price;
        auctionInfo auction;
        bool offered; // added to offer
    } // information about lot

    struct lotStart {
        address owner; // created by
        address contractAdd; // contract address
        uint256 id; // NFT id
        uint256 amount;
        uint256 Added; // date when NFT added to contract
    }

    struct auctionInfo {
        uint256 startAuction;
        uint256 endAuction;
        uint256 step;
        address lastBid;
    }

    struct currency {
        address contractAdd; // contract address
        uint256 sellerPrice; // amount what take seller
        uint256 buyerPrice; // price for buyer
    }

    struct offer {
        address owner; // created by
        uint256 lotID;
        uint256[] lotsOffer; // array of lot index
        currency cryptoOffer;
    }

    event ADD_NFT(
        address user,
        address contractAddress,
        uint256 NFT_ID,
        uint256 lotID,
        uint256 datetime
    );
    event SELL_NFT(
        address indexed user,
        uint256 indexed lotID,
        uint256 indexed datetime
    );
    event BUY_NFT(
        address indexed user,
        uint256 indexed lotID,
        uint256 indexed datetime
    );
    event GET_BACK(uint256 indexed lotID, uint256 indexed datetime);
    event MAKE_OFFER(
        uint256 indexed lotID,
        uint256 indexed offerID,
        uint256 indexed datetime
    );
    event CHOOSED_OFFER(
        uint256 indexed lotID,
        uint256 indexed offerID,
        uint256 indexed datetime
    );
    event REVERTED_OFFER(uint256 indexed lotID, uint256 indexed offerID, uint256 indexed datetime); 

    constructor(
        uint8 comission,
        uint256 comissionOffer,
        address wallet
    ) {
        setMarketComission(comission);
        setOfferComission(comissionOffer);
        setWallet(wallet);
    }

    function setMarketComission(uint8 comission) public onlyOwner {
        //TODO: if comission should be grater than zero - add require
        marketComission = comission;
    }

    function setOfferComission(uint256 comission) public onlyOwner {
        //TODO: if comission should be grater than zero - add require
        offerComission = comission;
    }

    function setWallet(address newWallet) public onlyOwner {
        require(newWallet != address(0x0) && newWallet != marketWallet, "Invalid market address");
        marketWallet = newWallet;
    }

    // add nft to contract
    function add(
        address contractAddress, //TODO: call variables with understandable names
        uint256 id,
        uint256 value,
        bytes memory data
    ) external {
        ERC1155 NFT_Contract = ERC1155(contractAddress);
        NFT_Contract.safeTransferFrom(
            msg.sender,
            address(this),
            id,
            value,
            data
        );
        lots.push(
            lotInfo(
                lotStart(msg.sender, contractAddress, id, value, block.timestamp),
                lotType.None,
                0,
                currency(address(0x0), 0, 0),
                auctionInfo(0, 0, 0, address(0x0)),
                false
            )
        ); // add lot to array
        lotOwner[msg.sender].push(lots.length - 1); // add lot id to owner array
        emit ADD_NFT(
            msg.sender,
            contractAddress,
            id,
            lots.length - 1,
            block.timestamp
        );
    }

    // set lot sell
    function sell(
        uint256 index,
        address contractAddress,
        uint256 price,
        uint256 date
    ) external {
        require(
            lots[index].creationInfo.owner == msg.sender &&
                lots[index].offered == false, // user must be owner and not added to offer
            "You are not the owner!(sell)"
        );
        lots[index].price.sellerPrice =
            price -
            (price * marketComission) /
            100; // set value what send to seller
        lots[index].sellStart = date;
        lots[index].price.buyerPrice = price; // set value what send buyer
        lots[index].price.contractAdd = contractAddress;
        lots[index].selling = lotType.FixedPrice;
        emit SELL_NFT(
            msg.sender,
            lots[index].creationInfo.id,
            block.timestamp
        );
    }

    function getBack(uint256 index, bytes memory data) public {
        returnNFT(index, msg.sender, data);
    }

    function returnNFT(
        uint256 index,
        address user,
        bytes memory data
    ) internal {
        lotInfo memory lot = lots[index];
        require(
            lot.creationInfo.owner == user,
            "You are not the owner!(return NFT)"
        );
        ERC1155 NFT_Contract = ERC1155(lot.creationInfo.contractAdd);
        delete lots[index];
        NFT_Contract.safeTransferFrom(
            address(this),
            lot.creationInfo.owner,
            lot.creationInfo.id,
            lot.creationInfo.amount,
            data
        );
        emit GET_BACK(lot.creationInfo.id, block.timestamp);
    }

    function buy(uint256 index, bytes memory data) external payable {
        lotInfo memory lot = lots[index];
        require(lot.selling == lotType.FixedPrice && lot.sellStart <= block.timestamp, "Not enough amount");
        delete lots[index];
        if (lot.price.contractAdd == address(0)) {
            // buy by crypto
            payable(lot.creationInfo.owner).transfer(lot.price.sellerPrice);
            payable(marketWallet).transfer(
                lot.price.buyerPrice - lot.price.sellerPrice
            );
        } else {
            // buy by tokens
            ERC20 tokenContract = ERC20(lot.price.contractAdd);
            tokenContract.transferFrom(
                msg.sender,
                lot.creationInfo.owner,
                lot.price.sellerPrice
            );
            tokenContract.transferFrom(
                msg.sender,
                marketWallet,
                lot.price.buyerPrice - lot.price.sellerPrice
            );
        }
        ERC1155 NFT_Contract = ERC1155(lot.creationInfo.contractAdd);
        NFT_Contract.safeTransferFrom(
            address(this),
            msg.sender,
            lot.creationInfo.id,
            lot.creationInfo.amount,
            data
        );
        emit BUY_NFT(msg.sender, lot.creationInfo.id, block.timestamp);
    }

    function makeOffer(
        uint256 index,
        uint256[] memory lotIndex,
        address tokenAddress,
        uint256 amount,
        bytes memory data
    ) external payable {
        // create offer
        require(
            msg.value >= offerComission &&
                lots[index].creationInfo.contractAdd != address(0) &&
                lots[index].selling != lotType.None,
            "You not send comission or lot not valid"
        );
        if (msg.value == offerComission) {
            if (lotIndex.length == 0) {
                // token
                ERC20 tokenContract = ERC20(tokenAddress);
                tokenContract.transferFrom(msg.sender, address(this), amount);
                offers.push(
                    offer(
                        msg.sender,
                        index,
                        lotIndex,
                        currency(
                            tokenAddress,
                            amount - (amount * marketComission) / 100,
                            amount
                        )
                    )
                );
            } else {
                for (uint256 i = 0; i < lotIndex.length; i++) {
                    require(
                        lots[lotIndex[i]].creationInfo.owner == msg.sender &&
                            lotIndex[i] != index &&
                            lots[lotIndex[i]].offered == false,
                        "You are not the owner or wrong lot"
                    );
                    lots[lotIndex[i]].offered = true;
                }
                if (tokenAddress != address(0)) {
                    // nft + token
                    ERC20 tokenContract = ERC20(tokenAddress);
                    tokenContract.transferFrom(
                        msg.sender,
                        address(this),
                        amount
                    );
                    offers.push(
                        offer(
                            msg.sender,
                            index,
                            lotIndex,
                            currency(
                                tokenAddress,
                                amount - (amount * marketComission) / 100,
                                amount
                            )
                        )
                    );
                } else {
                    //nft
                    offers.push(
                        offer(
                            msg.sender,
                            index,
                            lotIndex,
                            currency(address(0), 0, 0)
                        )
                    );
                }
            }
        } else {
            if (lotIndex.length != 0) {
                // crypto with nft
                offers.push(
                    offer(
                        msg.sender,
                        index,
                        lotIndex,
                        currency(
                            address(0),
                            (msg.value - offerComission) -
                                (msg.value * marketComission) /
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
                        lotIndex,
                        currency(
                            address(0),
                            (msg.value - offerComission) -
                                ((msg.value - offerComission) *
                                    marketComission) /
                                100,
                            msg.value
                        )
                    )
                );
            }
        }
        offerOwner[msg.sender].push(offers.length - 1);
        lotOffers[index].push(offers.length - 1);
        emit MAKE_OFFER(index, offers.length - 1, block.timestamp);
    }

    function cancelOffer(uint256 index) external {
        require(
            offers[index].owner == msg.sender,
            "You are not the owner!(cancel offer)"
        );
        offer memory localOffer = offers[index];
        delete offers[index];
        if (localOffer.cryptoOffer.contractAdd == address(0)) {
            if (localOffer.cryptoOffer.buyerPrice == 0) {
                payable(localOffer.owner).transfer(offerComission);
            } else {
                payable(localOffer.owner).transfer(
                    localOffer.cryptoOffer.buyerPrice
                );
            }
        } else {
            payable(localOffer.owner).transfer(offerComission);
            ERC20 tokenContract = ERC20(
                localOffer.cryptoOffer.contractAdd
            );
            tokenContract.transfer(
                localOffer.owner,
                localOffer.cryptoOffer.buyerPrice
            );
        }
        if (localOffer.lotsOffer.length != 0) {
            for (uint256 i = 0; i < localOffer.lotsOffer.length; i++) {
                returnNFT(localOffer.lotsOffer[i], msg.sender, "");
            }
        }
        emit REVERTED_OFFER(localOffer.lotID, index, block.timestamp);
    }

    function chooseOffer(
        uint256 lotID,
        uint256 offerID,
        bytes memory data
    ) external {
        require(
            lots[lotID].creationInfo.owner == msg.sender &&
                offers[offerID].lotID == lotID,
            "You are not owner"
        );
        lotInfo memory lot = lots[lotID];
        delete lots[lotID];
        ERC1155 NFT_Contract = ERC1155(lot.creationInfo.contractAdd);
        NFT_Contract.safeTransferFrom(
            address(this),
            offers[offerID].owner,
            lot.creationInfo.id,
            lot.creationInfo.amount,
            data
        );
        offer memory userOffer = offers[offerID];
        delete offers[offerID];
        if (userOffer.lotsOffer.length != 0) {
            // NFT
            for (uint256 i = 0; i < userOffer.lotsOffer.length; i++) {
                lotInfo memory offerLot = lots[userOffer.lotsOffer[i]];
                NFT_Contract = ERC1155(offerLot.creationInfo.contractAdd);
                delete lots[userOffer.lotsOffer[i]];
                NFT_Contract.safeTransferFrom(
                    address(this),
                    lot.creationInfo.owner,
                    offerLot.creationInfo.id,
                    offerLot.creationInfo.amount,
                    data
                );
            }
        }
        if (userOffer.cryptoOffer.contractAdd == address(0)) {
            // crypto
            if (userOffer.cryptoOffer.sellerPrice != 0) {
                payable(lot.creationInfo.owner).transfer(
                    userOffer.cryptoOffer.sellerPrice
                );
                payable(marketWallet).transfer(
                    userOffer.cryptoOffer.buyerPrice -
                        userOffer.cryptoOffer.sellerPrice -
                        marketComission
                );
            } else {
                payable(marketWallet).transfer(marketComission);
            }
        } else {
            // token
            ERC20 tokenContract = ERC20(
                userOffer.cryptoOffer.contractAdd
            );
            tokenContract.transfer(
                lot.creationInfo.owner,
                userOffer.cryptoOffer.sellerPrice
            );
        }
        emit CHOOSED_OFFER(lotID, offerID, block.timestamp);
    }

    function getLots(uint256[] memory indexes)
        external
        view
        returns (lotInfo[] memory)
    {
        lotInfo[] memory getLot;
        for (uint256 i = 0; i < indexes.length; i++) {
            getLot[i] = lots[indexes[i]];
        }
        return getLot;
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
                lotInfo(
                    lotStart(operator, msg.sender, id, value, block.timestamp),
                    lotType.None,
                    0,
                    currency(address(0), 0, 0),
                    auctionInfo(0, 0, 0, address(0)),
                    false
                )
            );
            lotOwner[operator].push(lots.length - 1);
            emit ADD_NFT(
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
