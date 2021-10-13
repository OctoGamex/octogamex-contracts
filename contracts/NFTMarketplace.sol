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
        address contractAddress; // contract address
        uint256 id; // NFT id
        uint256 amount;
        uint256 Added; // date when NFT added to contract
    }

    struct auctionInfo {
        uint256 startAuction;
        uint256 endAuction;
        uint256 step;
        uint256 nextStep;
        address lastBid;
    }

    struct currency {
        address contractAddress; // contract address
        uint256 sellerPrice; // amount what take seller
        uint256 buyerPrice; // price for buyer
    }

    struct offer {
        address owner; // created by
        uint256 lotID;
        uint256[] lotsOffer; // array of lot index
        currency cryptoOffer;
    }

    event AddNFT(
        address user,
        address contractAddress,
        uint256 NFT_ID,
        uint256 lotID,
        uint256 datetime
    );
    event SellNFT(
        address indexed user,
        uint256 indexed lotID,
        uint256 indexed datetime
    );
    event BuyNFT(
        address indexed user,
        uint256 indexed lotID,
        uint256 indexed datetime
    );
    event GetBack(uint256 indexed lotID, uint256 indexed datetime);
    event MakeOffer(
        uint256 indexed lotID,
        uint256 indexed offerID,
        uint256 indexed datetime
    );
    event ChoosedOffer(
        uint256 indexed lotID,
        uint256 indexed offerID,
        uint256 indexed datetime
    );
    event RevertedOffer(
        uint256 indexed lotID,
        uint256 indexed offerID,
        uint256 indexed datetime
    );
    event Auction(
        uint256 indexed dateTime,
        uint256 indexed id,
        address indexed owner
    );
    event BidMaked(
        uint256 indexed dateTime,
        uint256 indexed lotID,
        address indexed user
    );
    event AuctionEnd(uint256 indexed dateTime, uint256 indexed lotID);

    constructor(
        uint8 comission,
        uint256 comissionOffer,
        address wallet
    ) {
        setMarketComission(comission);
        setOfferComission(comissionOffer);
        setWallet(wallet);
    }

    /**
     * @param comission, percents what pay users of ERC20 tokens and cryptocurrency.
     * 100 = 0,1 %.
     * 1000 = 1 %.
     */
    function setMarketComission(uint8 comission) public onlyOwner {
        marketComission = comission;
    }

    /**
     * @param comission, amount of cryptocurrency what users pay for offers.
     */
    function setOfferComission(uint256 comission) public onlyOwner {
        offerComission = comission;
    }

    /**
     * @param newWallet, user address who takes all comission.
     * @notice setter user address (recipient comission).
     * Requirements:
     *
     * - wallet address not 0.
     * - the wallet is not the same as it was.
     */
    function setWallet(address newWallet) public onlyOwner {
        require(
            newWallet != address(0x0) && newWallet != marketWallet,
            "Invalid market address"
        );
        marketWallet = newWallet;
    }

    /**
     * @param contractAddress, contract address with NFT.
     * @param id, NFT id.
     * @param value, NFT amount.
     * @param data, data what can be added to transaction.
     * @notice add NFT to contract.
     * Requirements:
     *
     * - sended NFT value not 0.
     */
    function add(
        address contractAddress,
        uint256 id,
        uint256 value,
        bytes memory data
    ) external {
        require(value > 0, "Value is 0");
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
                lotStart(
                    msg.sender,
                    contractAddress,
                    id,
                    value,
                    block.timestamp
                ),
                lotType.None,
                0,
                currency(address(0x0), 0, 0),
                auctionInfo(0, 0, 0, 0, address(0x0)),
                false
            )
        ); // add lot to array
        lotOwner[msg.sender].push(lots.length - 1); // add lot id to owner array
        emit AddNFT(
            msg.sender,
            contractAddress,
            id,
            lots.length - 1,
            block.timestamp
        );
    }

    /**
     * @param index, lot index what user want sell.
     * @param contractAddress, ERC20 token contract address, zero address, if user want get cryptocurrency for NFT.
     * @param price, NFT price in ERC20 or cryptocurrency.
     * @param date, date when selling start.
     * @notice start NFT selling.
     * Requirements:
     *
     * - `lot owner` and `transcation creator` it's one person.
     * - NFT not added to any offer.
     */
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
            1000; // set value what send to seller
        lots[index].sellStart = date;
        lots[index].price.buyerPrice = price; // set value what send buyer
        lots[index].price.contractAddress = contractAddress;
        lots[index].selling = lotType.FixedPrice;
        emit SellNFT(msg.sender, lots[index].creationInfo.id, block.timestamp);
    }

    function getBack(uint256 index, bytes memory data) external {
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
        ERC1155 NFT_Contract = ERC1155(lot.creationInfo.contractAddress);
        delete lots[index];
        NFT_Contract.safeTransferFrom(
            address(this),
            lot.creationInfo.owner,
            lot.creationInfo.id,
            lot.creationInfo.amount,
            data
        );
        emit GetBack(lot.creationInfo.id, block.timestamp);
    }

    /**
     * @param index, lot index what user want buy.
     * @param data, data what can be added to transaction.
     * @notice NFT buying.
     * Requirements:
     *
     * - NFT is selling.
     * - user send transaction after start selling.
     */
    function buy(uint256 index, bytes memory data) external payable {
        lotInfo memory lot = lots[index];
        require(
            lot.selling == lotType.FixedPrice &&
                lot.sellStart <= block.timestamp,
            "Not enough amount"
        );
        delete lots[index];
        if (lot.price.contractAddress == address(0)) {
            // buy by crypto
            payable(lot.creationInfo.owner).transfer(lot.price.sellerPrice);
            payable(marketWallet).transfer(
                lot.price.buyerPrice - lot.price.sellerPrice
            );
        } else {
            // buy by tokens
            ERC20 tokenContract = ERC20(lot.price.contractAddress);
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
        ERC1155 NFT_Contract = ERC1155(lot.creationInfo.contractAddress);
        NFT_Contract.safeTransferFrom(
            address(this),
            msg.sender,
            lot.creationInfo.id,
            lot.creationInfo.amount,
            data
        );
        emit BuyNFT(msg.sender, lot.creationInfo.id, block.timestamp);
    }

    /**
     * @param index, lot index what user want.
     * @param lotIndex, array of NFT index what user want exchange for lot.
     * @param tokenAddress, ERC20 token contract address, zero address if user want give only nft or give cryptocurrency.
     * @param amount, amount of ERC20 token.
     * @notice Create offer for lot, offer can be: NFT, NFT + ERC20, NFT + cryptocurrency, ERC20, cryptocurrency.
     * Requirements:
     *
     * - NFT open for buy or exchange.
     * - sended cryptocurrency equal to or greater then offer comission
     * - lot still exists
     * - can't add to offer cryptocurrency and ERC20
     */
    function makeOffer(
        uint256 index,
        uint256[] memory lotIndex,
        address tokenAddress,
        uint256 amount
    ) external payable {
        // create offer
        require(
            !(msg.value > offerComission && amount > 0),
            "You send more then needed"
        );
        require(
            msg.value >= offerComission &&
                lots[index].creationInfo.contractAddress != address(0) &&
                lots[index].selling != lotType.None &&
                lots[index].selling != lotType.Auction,
            "You not send comission or lot not valid"
        );
        if (msg.value == offerComission) {
            if (lotIndex.length == 0) {
                // token
                require(amount > 1, "You send 0 tokens");
                ERC20 tokenContract = ERC20(tokenAddress);
                tokenContract.transferFrom(msg.sender, address(this), amount);
                offers.push(
                    offer(
                        msg.sender,
                        index,
                        lotIndex,
                        currency(
                            tokenAddress,
                            amount - (amount * marketComission) / 1000,
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
                    require(amount > 1, "You send 0 tokens");
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
                                amount - (amount * marketComission) / 1000,
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
                                1000,
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
                                1000,
                            msg.value
                        )
                    )
                );
            }
        }
        offerOwner[msg.sender].push(offers.length - 1);
        lotOffers[index].push(offers.length - 1);
        emit MakeOffer(index, offers.length - 1, block.timestamp);
    }

    /**
     * @param index, offer index what user want cancel.
     * @notice Cancel offer and return NFT, cryptocurrency, ERC20.
     * Requirements:
     *
     * - `offer owner` and `transcation creator` it's one person.
     */
    function cancelOffer(uint256 index) external {
        require(
            offers[index].owner == msg.sender,
            "You are not the owner!(cancel offer)"
        );
        offer memory localOffer = offers[index];
        delete offers[index];
        if (localOffer.cryptoOffer.contractAddress == address(0)) {
            if (localOffer.cryptoOffer.buyerPrice == 0) {
                payable(localOffer.owner).transfer(offerComission);
            } else {
                payable(localOffer.owner).transfer(
                    localOffer.cryptoOffer.buyerPrice
                );
            }
        } else {
            payable(localOffer.owner).transfer(offerComission);
            ERC20 tokenContract = ERC20(localOffer.cryptoOffer.contractAddress);
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
        emit RevertedOffer(localOffer.lotID, index, block.timestamp);
    }

    /**
     * @param lotID, lot index what user want exchange to offer.
     * @param offerID, offer index what user accepted.
     * @param data, data what can be added to transaction.
     * @notice Accept offer, offer (NFT, cryptocurrency, ERC20) transfer to seller, lot transfer to buyer.
     * Requirements:
     *
     * - `lot owner` and `transcation creator` it's one person.
     * - `lot index` and `lot index in offer` the same.
     */
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
        ERC1155 NFT_Contract = ERC1155(lot.creationInfo.contractAddress);
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
                NFT_Contract = ERC1155(offerLot.creationInfo.contractAddress);
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
        if (userOffer.cryptoOffer.contractAddress == address(0)) {
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
            ERC20 tokenContract = ERC20(userOffer.cryptoOffer.contractAddress);
            tokenContract.transfer(
                lot.creationInfo.owner,
                userOffer.cryptoOffer.sellerPrice
            );
        }
        emit ChoosedOffer(lotID, offerID, block.timestamp);
    }

    /**
     * @param indexes, array of NFT index.
     * @return array of object with info about NFT
     * @notice Get info about NFT by index.
     */
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

    /**
     * @param lotID, lot index in array.
     * @param startDate, date when auction start (open).
     * @param endDate, date when auction end.
     * @param step, minimal amount in percents from price which needs for deal bid.
     * @param tokenAddress, ERC20 token contract.
     * @param amount, ERC20 token amount.
     * @notice Setup lot for auction.
     */
    function startAuction(
        uint256 lotID,
        uint256 startDate,
        uint256 endDate,
        uint256 step,
        address tokenAddress,
        uint256 amount
    ) external {
        require(
            lots[lotID].creationInfo.owner == msg.sender &&
                lots[lotID].selling == lotType.None,
            "You are not owner or lot in sale"
        );
        require(startDate < endDate, "Auction start ended");
        lots[lotID].auction = auctionInfo(
            startDate,
            endDate,
            step,
            amount,
            address(0x0)
        );
        if (tokenAddress == address(0x0)) {
            lots[lotID].price = currency(address(0x0), 0, 0);
        } else {
            lots[lotID].price = currency(tokenAddress, 0, 0);
        }
        lots[lotID].selling = lotType.Auction;
        emit Auction(block.timestamp, lotID, msg.sender);
    }

    /**
     * @param lotID, lot index in array.
     * @param amount, value of ERC20 tokens for bid.
     * @notice Make bid in auction.
     */
    function makeBid(uint256 lotID, uint256 amount) external payable {
        require(
            lots[lotID].selling == lotType.Auction &&
                lots[lotID].auction.endAuction > block.timestamp && lots[lotID].auction.startAuction <= block.timestamp,
            "Lot not on auction"
        );
        if (lots[lotID].price.contractAddress == address(0x0)) {
            if (lots[lotID].auction.lastBid != msg.sender) {
                require(
                    msg.value >= lots[lotID].auction.nextStep,
                    "Not enought payment"
                );
                lots[lotID].auction.nextStep = msg.value + (msg.value * lots[lotID].auction.step) / 1000;
                if (lots[lotID].price.sellerPrice != 0) {
                    payable(lots[lotID].auction.lastBid).transfer(
                        lots[lotID].price.buyerPrice
                    );
                }
                lots[lotID].price = currency(
                    address(0x0),
                    msg.value - (msg.value * marketComission) / 1000,
                    msg.value
                );
                lots[lotID].auction.lastBid = msg.sender;
            } else {
                uint256 newPrice = lots[lotID].price.buyerPrice + msg.value;
                lots[lotID].price = currency(
                    address(0x0),
                    newPrice - (newPrice * marketComission) / 1000,
                    newPrice
                );
                lots[lotID].auction.nextStep = newPrice + (newPrice * lots[lotID].auction.step) / 1000;
            }
        } else {
            require(amount != 0, "You send 0 tokens!");
            ERC20 tokenContract = ERC20(lots[lotID].price.contractAddress);
            tokenContract.transferFrom(msg.sender, address(this), amount);
            if (lots[lotID].auction.lastBid != msg.sender) {
                require(
                    amount >= lots[lotID].auction.nextStep,
                    "Not enought payment"
                );
                if (lots[lotID].price.sellerPrice != 0) {
                    tokenContract.transfer(
                        lots[lotID].auction.lastBid,
                        lots[lotID].price.buyerPrice
                    );
                }
                lots[lotID].price.buyerPrice = amount;
                lots[lotID].price.sellerPrice =
                    amount -
                    (amount * marketComission) /
                    1000;
                lots[lotID].auction.nextStep = amount + amount * lots[lotID].auction.step / 1000;
                lots[lotID].auction.lastBid = msg.sender;
            } else {
                uint256 newPrice = lots[lotID].price.buyerPrice + amount;
                lots[lotID].price.buyerPrice = newPrice;
                lots[lotID].price.sellerPrice =
                    newPrice -
                    (newPrice * marketComission) /
                    1000;
                lots[lotID].auction.nextStep = newPrice + newPrice * lots[lotID].auction.step / 1000;
            }
        }
        emit BidMaked(block.timestamp, lotID, msg.sender);
    }

    /**
     * @param lotID, NFT index in array.
     * @param data, data what can be added to transaction.
     * @notice Send bid to NFT owner, NFT to auction winner.
     */
    function endAuction(uint256 lotID, bytes memory data) external {
        require(
            lots[lotID].selling == lotType.Auction, "It's not auction");
        require(lots[lotID].auction.endAuction <= block.timestamp, "Auction not ended");
        lotInfo memory lot = lots[lotID];
        delete lots[lotID];
        ERC1155 nft_contract = ERC1155(lot.creationInfo.contractAddress);
        if (lot.price.sellerPrice == 0) {
            nft_contract.safeTransferFrom(
                address(this),
                lot.creationInfo.owner,
                lot.creationInfo.id,
                lot.creationInfo.amount,
                data
            );
        } else {
            nft_contract.safeTransferFrom(
                address(this),
                lot.auction.lastBid,
                lot.creationInfo.id,
                lot.creationInfo.amount,
                data
            );
            if (lot.price.contractAddress == address(0x0)) {
                payable(lot.creationInfo.owner).transfer(lot.price.sellerPrice);
                payable(marketWallet).transfer(
                    lot.price.buyerPrice - lot.price.sellerPrice
                );
            } else {
                ERC20 tokenContract = ERC20(lot.price.contractAddress);
                tokenContract.transfer(
                    lot.creationInfo.owner,
                    lot.price.sellerPrice
                );
                tokenContract.transfer(
                    marketWallet,
                    lot.price.buyerPrice - lot.price.sellerPrice
                );
            }
        }
        emit AuctionEnd(block.timestamp, lotID);
    }

    /**
     * @param operator, user address who transfer NFT to contract.
     * @param from, user address from which NFT was sended.
     * @param id, id of NFT which were sent.
     * @param value, value of NFT which were sent.
     * @param data, data what can be added to transaction.
     * @notice Need for receive NFT1155.
     */
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
                    auctionInfo(0, 0, 0, 0, address(0)),
                    false
                )
            );
            lotOwner[operator].push(lots.length - 1);
            emit AddNFT(
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

    /**
     * @param operator, user address who transfer NFT to contract.
     * @param from, user address from which NFT was sended.
     * @param ids, array of id of NFT which were sent.
     * @param values, array of value of NFT which were sent.
     * @param data, data what can be added to transaction.
     * @notice Need for receive many NFT1155 with difference id.
     */
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
