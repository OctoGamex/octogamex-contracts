//SPDX-License-Identifier: MIT

pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./VariableType.sol";
import "./Auction.sol";
import "./Admin.sol";

contract NFTMarketplace is Ownable, Pausable, VariablesTypes {
    address public marketWallet; // Address for transfer comission
    Auction public auctionContract;
    Admin public adminContract;

    lotInfo[] public lots; // array of NFT lot
    offer[] public offers; // array of offers to lots

    mapping(address => uint256[]) public lotOwner; // mapping user address to array of index lots created by user
    mapping(address => uint256[]) public offerOwner; // mapping user address to array of index offer created by user
    mapping(uint256 => uint256[]) public lotOffers; // mapping index lot => array of index offers

    event AddNFT(
        address user,
        address contractAddress,
        uint256 NFT_ID,
        uint256 lotID,
        uint256 datetime,
        uint256 amount,
        uint256 typeOfLot
    );
    event SellNFT(
        address indexed user,
        uint256 indexed lotID,
        uint256 indexed startDate,
        uint256 amount,
        uint256 price,
        address tokenAddress,
        bool openForOffer
    );
    event BuyNFT(
        address indexed user,
        uint256 indexed lotID,
        uint256 indexed datetime,
        uint256 amount
    );
    // event GetBack(
    //     uint256 indexed lotID,
    //     uint256 indexed datetime,
    //     uint256 amount
    // );
    event MakeOffer(
        address indexed user,
        uint256 indexed lotID,
        uint256 indexed offerID,
        address tokenAddress,
        uint256 tokenAmount,
        uint256[] itemLotIds,
        uint256 tokenValue
    );
    // event ChoosedOffer(
    //     uint256 indexed lotID,
    //     uint256 indexed offerID,
    //     uint256 indexed datetime
    // );
    // event RevertedOffer(
    //     uint256 indexed lotID,
    //     uint256 indexed offerID,
    //     uint256 indexed datetime
    // );
    // event ExchangeNFT(
    //     uint256 indexed startDate,
    //     uint256 indexed lotID,
    //     address indexed owner,
    //     uint256 amount
    // );

    constructor(
        address wallet,
        address admin
    ) {
        setWallet(wallet);
        setAdminContract(admin);
    }

    function setPause() public onlyOwner{
        _pause();
    }

    function unPause() public onlyOwner{
        _unpause();
    }

    function setNFT_Collection(address contractAddress) external {
        require(msg.sender == address(adminContract), "19");

        ERC1155(contractAddress).setApprovalForAll(
            address(auctionContract),
            true
        );
    }

    function setAuctionContract(address contractAddress) external onlyOwner {
        auctionContract = Auction(contractAddress);
    }

    function auctionLot(uint256 lotID, VariablesTypes.lotInfo memory lot)
        external
        whenNotPaused
    {
        require(
            msg.sender == address(auctionContract),
            "3"
        );
        lots[lotID] = lot;
    }

    function calculateCommission(uint256 price, address collectionCommission) public view returns (uint256){
        (uint256 commission, address owner) = getCollectionsInfo(collectionCommission);
        return price - (price * (commission + getMarketCommission())) / 1000;
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
            newWallet != address(0) && newWallet != marketWallet,
            "5"
        );
        marketWallet = newWallet;
    }

    function setAdminContract(address newAdmin) public onlyOwner {
        require(
            newAdmin != address(0) && newAdmin != address(adminContract),
            "21"
        );
        adminContract = Admin(newAdmin);
    }


    function sendNFT(
        address contractAddress,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data,
        bool isERC1155
    ) internal {
        if (isERC1155) {
            ERC1155 NFT_Contract = ERC1155(contractAddress);
            NFT_Contract.safeTransferFrom(from, to, id, value, data);
        } else {
            ERC721 NFT_Contract = ERC721(contractAddress);
            NFT_Contract.safeTransferFrom(from, to, id, data);
        }
    }

    function calculateMarket(uint256 price, uint256 commission)
        internal
        pure
        returns (uint256)
    {
        return (price * commission) / 1000;
    }

    function getCollectionsInfo(address contractAddress) public view returns (uint256, address) {
        return  adminContract.collections(contractAddress);
    }

    function getMarketCommission() public view returns (uint256) {
        return  adminContract.marketCommission();
    }

    function getOfferCommission() public view returns (uint256) {
        return  adminContract.offerCommission();
    }

    function sendCrypto(
        lotInfo memory lot,
        uint256 sellerPrice,
        uint256 buyerPrice
    ) internal {
        payable(lot.creationInfo.owner).transfer(sellerPrice);
        (uint256 commission, address owner) = getCollectionsInfo(
            lot.creationInfo.contractAddress
        );
        if (getMarketCommission() > 0) {
            payable(marketWallet).transfer(
                calculateMarket(buyerPrice, getMarketCommission())
            );
        }
        if (commission > 0) {
            payable(owner)
                .transfer(
                    calculateMarket(buyerPrice,commission)
                );
        }
    }

    function sendERC20(
        address contractAddress,
        address from,
        address to,
        uint256 amount
    ) internal {
        ERC20 tokenContract = ERC20(contractAddress);
        tokenContract.transferFrom(from, to, amount);
    }

    function getNextStep(uint256 lotID) external view returns (uint256) {
        return lots[lotID].auction.nextStep;
    }

    /**
     * @param contractAddress, contract address with NFT.
     * @param id, NFT id.
     * @param value, NFT amount.
     * @param isERC1155 is ERC-1155.
     * param typeOfLot 0 - none, 1 - fixed price, 2 - auction, 3 - exchange.
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
        bool isERC1155,
        lotType typeOfLot,
        bytes memory data
    ) public whenNotPaused {
        require(value > 0 && contractAddress != address(0), "6");
        if(ERC1155(contractAddress).isApprovedForAll(contractAddress, address(auctionContract))){
            ERC1155(contractAddress).setApprovalForAll(
                address(auctionContract),
                true
            );
        }
        if (isERC1155) {
            sendNFT(
                contractAddress,
                msg.sender,
                address(this),
                id,
                value,
                data,
                isERC1155
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
                    currency(address(0), 0, 0),
                    auctionInfo(0, 0, 0, 0, address(0)),
                    false,
                    isERC1155,
                    false
                )
            ); // add lot to array
            emit AddNFT(
                msg.sender,
                contractAddress,
                id,
                lots.length - 1,
                block.timestamp,
                value,
                uint256(typeOfLot)
            );
        } else {
            sendNFT(
                contractAddress,
                msg.sender,
                address(this),
                id,
                value,
                data,
                isERC1155
            );
            lots.push(
                lotInfo(
                    lotStart(
                        msg.sender,
                        contractAddress,
                        id,
                        1,
                        block.timestamp
                    ),
                    lotType.None,
                    0,
                    currency(address(0), 0, 0),
                    auctionInfo(0, 0, 0, 0, address(0)),
                    false,
                    isERC1155,
                    false
                )
            ); // add lot to array
            emit AddNFT(
                msg.sender,
                contractAddress,
                id,
                lots.length - 1,
                block.timestamp,
                1,
                uint256(typeOfLot)
            );
        }
        lotOwner[msg.sender].push(lots.length - 1); // add lot id to owner array
    }

    /**
     * @param contractAddress, contract address with NFT.
     * @param id, NFT id.
     * @param value, NFT amount.
     * @param isERC1155, is ERC1155 standart.
     * @param startDate, date wheb auction start or start sell.
     * @param tokenAddress, ERC20 address.
     * @param price, amount ERC20.
     * @param data, data what can be added to transaction.
     * @notice add NFT to contract and sell or auction.
     */
    function NFT_Sale(
        address contractAddress,
        uint256 id,
        uint256 value,
        bool isERC1155,
        uint256 startDate,
        address tokenAddress,
        uint256 price,
        bool openForOffers,
        bytes memory data
    ) external whenNotPaused {
        add(contractAddress, id, value, isERC1155, lotType.FixedPrice, data);
        uint256 lotID = lots.length - 1;
        sell(lotID, tokenAddress, price, openForOffers, startDate);
    }

    /**
     * @param contractAddress, array of contract address with NFT.
     * @param id, array of NFT id.
     * @param value, array of NFT amount.
     * @param isERC1155, array of is ERC1155 standart.
     * @param lot, lot id what user want get.
     * @param tokenAddress, ERC20 address.
     * @param amount, amount ERC20.
     * @param data, data what can be added to transaction.
     * @notice add NFT to contract and make offer.
     */
    function NFT_Offer(
        address[] memory contractAddress,
        uint256[] memory id,
        uint256[] memory value,
        bool[] memory isERC1155,
        uint256 lot,
        address tokenAddress,
        uint256 amount,
        bytes memory data
    ) external payable whenNotPaused {
        uint256[] memory lotIDs = new uint256[](contractAddress.length);
        for (uint256 i = 0; i < contractAddress.length; i++) {
            add(
                contractAddress[i],
                id[i],
                value[i],
                isERC1155[i],
                lotType.Exchange,
                data
            );
            lotIDs[i] = lots.length - 1;
        }
        makeOffer(lot, lotIDs, tokenAddress, amount);
    }

    function exchangeSell(uint256 index, uint256 date, lotType lot, bool openToOffer) internal {
            lots[index].sellStart = date;
            lots[index].selling = lot;
            lots[index].openForOffers = openToOffer;
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
        bool openForOffers,
        uint256 date
    ) public whenNotPaused {
        require(
            lots[index].creationInfo.owner == msg.sender &&
                !lots[index].offered &&
                lots[index].selling == lotType.None, // user must be owner and not added to offer
            "7"
        );
        require(
            adminContract.NFT_ERC20_Supports(lots[index].creationInfo.contractAddress,
                contractAddress) ||
                contractAddress == address(0),
            "8"
        );

        if(date < block.timestamp){
            date = block.timestamp;
        }

        require(date - block.timestamp <= 2692000, "18");

        if (price == 0) {
            exchangeSell(index, date, lotType.Exchange, true);
            // emit ExchangeNFT(
            //     date,
            //     index,
            //     msg.sender,
            //     lots[index].creationInfo.amount
            // );
        } else {
            lots[index].price.sellerPrice = calculateCommission(
                price,
                lots[index].creationInfo.contractAddress
            ); // set value what send to seller
            exchangeSell(index, date, lotType.FixedPrice, openForOffers);
            lots[index].price.buyerPrice = price; // set value what send buyer
            lots[index].price.contractAddress = contractAddress;
            emit SellNFT(
                msg.sender,
                index,
                date,
                lots[index].creationInfo.amount,
                price,
                contractAddress,
                openForOffers
            );
        }
    }

    function getBack(uint256 index, bytes memory data) external {
        returnNFT(index, data);
    }

    /**
     * @param index, lot index what user want return.
     * @param data, data what can added to transaction.
     * @notice return NFT to owner.
     */
    function returnNFT(uint256 index, bytes memory data) internal {
        lotInfo memory lot = lots[index];
        require(lot.creationInfo.owner == msg.sender && lot.selling != lotType.Auction, "9");
        delete lots[index];
        sendNFT(
            lot.creationInfo.contractAddress,
            address(this),
            lot.creationInfo.owner,
            lot.creationInfo.id,
            lot.creationInfo.amount,
            data,
            lot.isERC1155
        );
        // emit GetBack(
        //     index,
        //     block.timestamp,
        //     lots[index].creationInfo.amount
        // );
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
    function buy(uint256 index, bytes memory data) external payable whenNotPaused {
        lotInfo memory lot = lots[index];
        require(
            lot.selling == lotType.FixedPrice &&
                lot.sellStart <= block.timestamp,
            "10"
        );
        delete lots[index];
        if (lot.price.contractAddress == address(0)) {
            // buy by crypto
            require(msg.value == lot.price.buyerPrice, "11");
            sendCrypto(lot, lot.price.sellerPrice, lot.price.buyerPrice);
        } else {
            // buy by tokens
            ERC20 tokenContract = ERC20(lot.price.contractAddress);
            tokenContract.transferFrom(
                msg.sender,
                lot.creationInfo.owner,
                lot.price.sellerPrice
            );
            if (getMarketCommission() > 0) {
                tokenContract.transferFrom(
                    msg.sender,
                    marketWallet,
                    calculateMarket(lot.price.buyerPrice, getMarketCommission())
                );
            }

            (uint256 commission, address owner) = getCollectionsInfo(
                lot.creationInfo.contractAddress
            );
            if (commission > 0) {
                tokenContract.transferFrom(
                    msg.sender,owner,
                    calculateMarket(
                        lot.price.buyerPrice, commission
                    )
                );
            }
        }
        sendNFT(
            lot.creationInfo.contractAddress,
            address(this),
            msg.sender,
            lot.creationInfo.id,
            lot.creationInfo.amount,
            data,
            lot.isERC1155
        );
        emit BuyNFT(
            msg.sender,
            index,
            block.timestamp,
            lots[index].creationInfo.amount
        );
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
    ) public payable whenNotPaused {
        uint256 cryptoValue = msg.value;
        // create offer
        require(
            lots[index].creationInfo.contractAddress != address(0) &&
            lots[index].selling != lotType.None &&
            lots[index].selling != lotType.Auction &&
            lots[index].openForOffers,
            "12"
        );
        require(
            adminContract.NFT_ERC20_Supports(lots[index].creationInfo.contractAddress,
            tokenAddress
            ) ||
            tokenAddress == address(0),
            "8"
        );
        if (amount > 0) {
            if (lotIndex.length == 0) {
                // token
                require(
                    amount > 0 && msg.value == 0,
                    "13"
                );
                sendERC20(tokenAddress, msg.sender, address(this), amount);
                offers.push(
                    offer(
                        msg.sender,
                        index,
                        lotIndex,
                        currency(
                            tokenAddress,
                            calculateCommission(
                                amount,
                                lots[index].creationInfo.contractAddress
                            ),
                            amount
                        )
                    )
                );
            } else {
                for (uint256 i = 0; i < lotIndex.length; i++) {
                    require(
                        lots[lotIndex[i]].creationInfo.owner == msg.sender &&
                        lotIndex[i] != index &&
                        !lots[lotIndex[i]].offered,
                        "14"
                    );
                    lots[lotIndex[i]].offered = true;
                }
                if (tokenAddress != address(0)) {
                    // nft + token
                    require(
                        amount > 0 && msg.value == getOfferCommission(),
                        "15"
                    );
                    cryptoValue = msg.value - getOfferCommission();
                    sendERC20(tokenAddress, msg.sender, address(this), amount);
                    offers.push(
                        offer(
                            msg.sender,
                            index,
                            lotIndex,
                            currency(
                                tokenAddress,
                                calculateCommission(
                                    amount,
                                    lots[index].creationInfo.contractAddress
                                ),
                                amount
                            )
                        )
                    );
                }
            }
        } else {
            require(
                tokenAddress == address(0),
                "17"
            );
            if(lotIndex.length != 0) {
                for (uint256 i = 0; i < lotIndex.length; i++) {
                    require(
                        lots[lotIndex[i]].creationInfo.owner == msg.sender &&
                        lotIndex[i] != index &&
                        !lots[lotIndex[i]].offered,
                        "14"
                    );
                    lots[lotIndex[i]].offered = true;
                }

                if(msg.value == getOfferCommission()) {
                    //nft
                    cryptoValue = msg.value - getOfferCommission();
                    offers.push(
                        offer(
                            msg.sender,
                            index,
                            lotIndex,
                            currency(address(0), 0, 0)
                        )
                    );
                } else {
                    // crypto with nft
                    cryptoValue = msg.value - getOfferCommission();
                    offers.push(
                        offer(
                            msg.sender,
                            index,
                            lotIndex,
                            currency(
                                address(0),
                                calculateCommission(
                                    msg.value - getOfferCommission(),
                                    lots[index].creationInfo.contractAddress
                                ),
                                msg.value
                            )
                        )
                    );
                }
            }else {
                // crypto
                offers.push(
                    offer(
                        msg.sender,
                        index,
                        lotIndex,
                        currency(
                            address(0),
                            calculateCommission(
                                msg.value,
                                lots[index].creationInfo.contractAddress
                            ),
                            msg.value
                        )
                    )
                );
            }
        }
        offerOwner[msg.sender].push(offers.length - 1);
        lotOffers[index].push(offers.length - 1);
        emit MakeOffer(
            msg.sender,
            index,
            offers.length - 1,
            tokenAddress,
            amount,
            lotIndex,
            cryptoValue);
    }

    /**
     * @param index, offer index what user want cancel.
     * @notice Cancel offer and return NFT, cryptocurrency, ERC20.
     * Requirements:
     *
     * - `offer owner` and `transcation creator` it's one person.
     */
    function cancelOffer(uint256 index) external  {
        require(
            offers[index].owner == msg.sender,
            "9"
        );
        offer memory localOffer = offers[index];
        delete offers[index];
        if (localOffer.price.contractAddress == address(0)) {
            if (localOffer.price.buyerPrice == 0) {
                payable(localOffer.owner).transfer(getOfferCommission());
            } else {
                payable(localOffer.owner).transfer(localOffer.price.buyerPrice);
            }
        } else {
            payable(localOffer.owner).transfer(getOfferCommission());
            ERC20 tokenContract = ERC20(localOffer.price.contractAddress);
            tokenContract.transfer(
                localOffer.owner,
                localOffer.price.buyerPrice
            );
        }
        if (localOffer.lotsOffer.length != 0) {
            for (uint256 i = 0; i < localOffer.lotsOffer.length; i++) {
                returnNFT(localOffer.lotsOffer[i], "");
            }
        }
        // emit RevertedOffer(localOffer.lotID, index, block.timestamp);
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
    ) external whenNotPaused {
        require(
            lots[lotID].creationInfo.owner == msg.sender &&
                offers[offerID].lotID == lotID,
            "9"
        );
        lotInfo memory lot = lots[lotID];
        delete lots[lotID];
        sendNFT(
            lot.creationInfo.contractAddress,
            address(this),
            offers[offerID].owner,
            lot.creationInfo.id,
            lot.creationInfo.amount,
            data,
            lot.isERC1155
        );
        offer memory userOffer = offers[offerID];
        delete offers[offerID];
        if (userOffer.lotsOffer.length != 0) {
            // NFT
            for (uint256 i = 0; i < userOffer.lotsOffer.length; i++) {
                lotInfo memory offerLot = lots[userOffer.lotsOffer[i]];
                delete lots[userOffer.lotsOffer[i]];
                sendNFT(
                    offerLot.creationInfo.contractAddress,
                    address(this),
                    lot.creationInfo.owner,
                    offerLot.creationInfo.id,
                    offerLot.creationInfo.amount,
                    data,
                    offerLot.isERC1155
                );
            }
        }
        if (userOffer.price.contractAddress == address(0)) {
            // crypto
            if (userOffer.price.sellerPrice != 0) {
                sendCrypto(
                    lot,
                    userOffer.price.sellerPrice,
                    userOffer.price.buyerPrice
                );
            } else {
                payable(marketWallet).transfer(getOfferCommission());
            }
        } else {
            // token
            ERC20 tokenContract = ERC20(userOffer.price.contractAddress);
            tokenContract.transfer(
                lot.creationInfo.owner,
                userOffer.price.sellerPrice
            );
            if (getMarketCommission() > 0) {
                tokenContract.transfer(
                    marketWallet,
                    calculateMarket(
                        userOffer.price.buyerPrice,
                            getMarketCommission()
                    )
                );
            }

            (uint256 commission, address owner) = getCollectionsInfo(
                lot.creationInfo.contractAddress
            );
            if (commission > 0) {
                tokenContract.transfer(
                    owner,
                    calculateMarket(userOffer.price.buyerPrice, commission)
                );
            }
        }
        // emit ChoosedOffer(lotID, offerID, block.timestamp);
    }


    function getLotsLength() external view returns (uint256 length) {
        length = lots.length;
    }

    /**
     *  indexes, array of NFT index.
     *  array of object with info about NFT
     * @notice Get info about NFT by index.
     */
    function getInfo(address user)
        external
        view
        returns (uint256[] memory userLots, uint256[] memory userOffers)
    {
        userLots = lotOwner[user];
        userOffers = offerOwner[user];
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
    ) external whenNotPaused returns (bytes4) {
        require(
            adminContract.NFT_Collections(msg.sender),
            "2"
        );
        if (operator != address(this)) {
            if (operator == address(auctionContract)) {
                lots.push(
                    lotInfo(
                        lotStart(from, msg.sender, id, value, block.timestamp),
                        lotType.None,
                        0,
                        currency(address(0), 0, 0),
                        auctionInfo(0, 0, 0, 0, address(0)),
                        false,
                        true,
                        false
                    )
                );
                lotOwner[from].push(lots.length - 1);
                emit AddNFT(
                    from,
                    msg.sender,
                    id,
                    lots.length - 1,
                    block.timestamp,
                    value,
                    uint256(lotType.None)
                );
            } else {
                revert("20");
            }
        }
        return 0xf23a6e61; // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes")))
    }

    /**
     * @param operator, user address who transfer NFT to contract.
     * @param from, user address from which NFT was sended.
     * @param id, id of NFT which were sent.
     * @param data, data what can be added to transaction.
     * @notice Need for receive NFT721.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 id,
        bytes calldata data
    ) public virtual whenNotPaused returns (bytes4) {
        require(
            adminContract.NFT_Collections(msg.sender),
            "2"
        );
        if (operator != address(this)) {
            if (operator == address(auctionContract)) {
                lots.push(
                    lotInfo(
                        lotStart(from, msg.sender, id, 1, block.timestamp),
                        lotType.None,
                        0,
                        currency(address(0), 0, 0),
                        auctionInfo(0, 0, 0, 0, address(0)),
                        false,
                        false,
                        false
                    )
                );
                lotOwner[from].push(lots.length - 1);
                emit AddNFT(
                    from,
                    msg.sender,
                    id,
                    lots.length - 1,
                    block.timestamp,
                    1,
                    uint256(lotType.None)
                );
            } else {
                revert("20");
            }
        }
        return 0x150b7a02; // bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))
    }

    function getLotsOffers(uint256 indexes)
        external
        view
        returns (uint256[] memory getLot)
    {
        getLot = lotOffers[indexes];
    }

    /**
     * @param operator, user address who transfer NFT to contract.
     * @param from, user address from which NFT was sended.
     * @param ids, array of id of NFT which were sent.
     * @param values, array of value of NFT which were sent.
     * @param data, data what can be added to transaction.
     * @notice Need for receive many NFT1155 with difference id.
     */
    //  function onERC1155BatchReceived(
    //      address operator,
    //      address from,
    //      uint256[] calldata ids,
    //      uint256[] calldata values,
    //      bytes calldata data
    //  ) external pure returns (bytes4) {
    //      return
    //          bytes4(
    //              keccak256(
    //                  "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"
    //              )
    //          );
    //  }
}
