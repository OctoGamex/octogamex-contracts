//SPDX-License-Identifier: MIT

pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./VariableType.sol";
import "./Auction.sol";

contract NFTMarketplace is Ownable, VariablesTypes {
    uint256 public marketCommission; // Market comission in percents
    uint256 public offerCommission; // Fixed comission for create proposition

    address public marketWallet; // Address for transfer comission
    Auction auctionContract;

    lotInfo[] public lots; // array of NFT lot
    offer[] public offers; // array of offers to lots

    mapping(address => uint256[]) public lotOwner; // mapping user address to array of index lots created by user
    mapping(address => uint256[]) public offerOwner; // mapping user address to array of index offer created by user
    mapping(uint256 => uint256[]) public lotOffers; // mapping index lot => array of index offers
    mapping(address => bool) public NFT_Collections; // if return true, then NFT stay on this contract, else revert transaction
    mapping(address => mapping(address => bool)) public NFT_ERC20_Supports; // NFT address => ERC20 tokens address => does supported
    mapping(address => collectionInfo) public collections; // collection comission in percents

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
        uint256 indexed datetime,
        uint256 amount
    );
    event BuyNFT(
        address indexed user,
        uint256 indexed lotID,
        uint256 indexed datetime,
        uint256 amount
    );
    event GetBack(
        uint256 indexed lotID,
        uint256 indexed datetime,
        uint256 amount
    );
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
    event ExchangeNFT(
        uint256 indexed dateTime,
        uint256 indexed lotID,
        address indexed owner,
        uint256 amount
    );

    modifier checkContract(address contractAddress) {
        require(Address.isContract(contractAddress), "It's not contract");
        _;
    }

    constructor(
        uint256 commission,
        uint256 commissionOffer,
        address wallet
    ) {
        setMarketCommission(commission);
        setOfferCommission(commissionOffer);
        setWallet(wallet);
    }

    function setAuctionContract(address contractAddress) external onlyOwner {
        auctionContract = Auction(contractAddress);
    }

    function setCollectionCommission(address contractNFT, uint256 commission)
        external
        onlyOwner
    {
        require(NFT_Collections[contractNFT] == true, "NFT not supported");
        collections[contractNFT].commission = commission;
    }

    function setCollectionOwner(address contractAddress, address owner)
        external
        onlyOwner
    {
        require(
            NFT_Collections[contractAddress] == true && owner != address(0x0),
            "NFT not supported"
        );
        collections[contractAddress].owner = owner;
    }

    function auctionLot(uint256 lotID, VariablesTypes.lotInfo memory lot)
        external
    {
        require(
            msg.sender == address(auctionContract),
            "You do not have enough rights"
        );
        lots[lotID] = lot;
    }

    /**
     * @param commission, percents what pay users of ERC20 tokens and cryptocurrency.
     * 100 = 10 %.
     * 1000 = 100 %.
     */
    function setMarketCommission(uint256 commission) public onlyOwner {
        require(commission <= 1000, "The commission is too big");
        marketCommission = commission;
    }

    /**
     * @param comission, amount of cryptocurrency what users pay for offers.
     */
    function setOfferCommission(uint256 comission) public onlyOwner {
        offerCommission = comission;
    }

    function calculateCommission(uint256 price, address commission)
        internal
        view
        returns (uint256)
    {
        return
            price -
            (price * (collections[commission].commission + marketCommission)) /
            1000;
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
     * @param contractAddress, NFT contract address which transfer NFT.
     * @param canTransfer, if true, then we can take NFT from this contract, else revert transaction.
     * @notice setter for NFT collection support.
     */
    function setNFT_Collection(address contractAddress, bool canTransfer, bool isERC1155)
        external
        onlyOwner
        checkContract(contractAddress)
    {
        NFT_Collections[contractAddress] = canTransfer;
        ERC1155(contractAddress).setApprovalForAll(address(auctionContract), true);
    }

    /**
     * @param NFT_Address, NFT contract address.
     * @param ERC20_Address, array of ERC20 address what we want setup.
     * @param canTransfer, array of bool, which say is this NFT collection supported this ERC20 tokens .
     * @notice setter for NFT collection ERC20 support.
     */
    function setERC20_Support(
        address NFT_Address,
        address[] memory ERC20_Address,
        bool[] memory canTransfer
    ) external onlyOwner checkContract(NFT_Address) {
        for (uint256 i = 0; i < ERC20_Address.length; i++) {
            require(Address.isContract(ERC20_Address[i]), "It's not contract");
            ERC20(ERC20_Address[i]).name();
            ERC20(ERC20_Address[i]).symbol();
            NFT_ERC20_Supports[NFT_Address][ERC20_Address[i]] = canTransfer[i];
        }
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
        if (isERC1155 == true) {
            ERC1155 NFT_Contract = ERC1155(contractAddress);
            NFT_Contract.safeTransferFrom(from, to, id, value, data);
        } else {
            ERC721 NFT_Contract = ERC721(contractAddress);
            NFT_Contract.safeTransferFrom(from, to, id, data);
        }
    }

    function sendCrypto(
        lotInfo memory lot,
        uint256 sellerPrice,
        uint256 buyerPrice
    ) internal {
        payable(lot.creationInfo.owner).transfer(sellerPrice);
        payable(marketWallet).transfer((buyerPrice * marketCommission) / 1000);
        payable(collections[lot.creationInfo.contractAddress].owner).transfer(
            (buyerPrice *
                collections[lot.creationInfo.contractAddress].commission) / 1000
        );
    }

    function sendERC20Price(address contractAddress, lotInfo memory lot)
        internal
    {
        ERC20 tokenContract = ERC20(contractAddress);
        tokenContract.transferFrom(
            msg.sender,
            lot.creationInfo.owner,
            lot.price.sellerPrice
        );
        tokenContract.transferFrom(
            msg.sender,
            marketWallet,
            (lot.price.buyerPrice * marketCommission) / 1000
        );
        tokenContract.transferFrom(
            msg.sender,
            collections[lot.creationInfo.contractAddress].owner,
            (lot.price.buyerPrice *
                collections[lot.creationInfo.contractAddress].commission) / 1000
        );
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
    ) public {
        require(value > 0 && contractAddress != address(0x0), "Value is 0");
        if (isERC1155 == true) {
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
                    typeOfLot,
                    0,
                    currency(address(0x0), 0, 0),
                    auctionInfo(0, 0, 0, 0, address(0x0)),
                    false,
                    isERC1155
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
                    currency(address(0x0), 0, 0),
                    auctionInfo(0, 0, 0, 0, address(0x0)),
                    false,
                    isERC1155
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
        bytes memory data
    ) external {
        add(contractAddress, id, value, isERC1155, lotType.FixedPrice, data);
        uint256 lotID = lots.length - 1;
        sell(lotID, tokenAddress, price, startDate);
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
    ) external {
        uint256[] memory lotIDs;
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
    ) public {
        require(
            lots[index].selling != lotType.FixedPrice &&
                lots[index].selling != lotType.Exchange,
            "Lot is already exhibited"
        );
        require(
            lots[index].creationInfo.owner == msg.sender &&
                lots[index].offered == false &&
                lots[index].selling == lotType.None, // user must be owner and not added to offer
            "You are not the owner or lot is selling!"
        );
        require(
            NFT_ERC20_Supports[lots[index].creationInfo.contractAddress][
                contractAddress
            ] ==
                true ||
                contractAddress == address(0x0),
            "Not supported"
        );
        if (price == 0) {
            lots[index].sellStart = date;
            lots[index].selling = lotType.Exchange;
            emit ExchangeNFT(
                block.timestamp,
                index,
                msg.sender,
                lots[index].creationInfo.amount
            );
        } else {
            lots[index].price.sellerPrice = calculateCommission(
                price,
                lots[index].creationInfo.contractAddress
            ); // set value what send to seller
            lots[index].sellStart = date;
            lots[index].price.buyerPrice = price; // set value what send buyer
            lots[index].price.contractAddress = contractAddress;
            lots[index].selling = lotType.FixedPrice;
            emit SellNFT(
                msg.sender,
                lots[index].creationInfo.id,
                block.timestamp,
                lots[index].creationInfo.amount
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
        require(lot.creationInfo.owner == msg.sender, "You are not owner");
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
        emit GetBack(
            lot.creationInfo.id,
            block.timestamp,
            lots[index].creationInfo.amount
        );
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
            "Not selling or selling not started"
        );
        delete lots[index];
        if (lot.price.contractAddress == address(0)) {
            // buy by crypto
            require(msg.value == lot.price.buyerPrice, "Not enought payment");
            sendCrypto(lot, lot.price.sellerPrice, lot.price.buyerPrice);
        } else {
            // buy by tokens
            sendERC20Price(lot.price.contractAddress, lot);
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
            lot.creationInfo.id,
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
    ) public payable {
        // create offer
        require(
            lots[index].creationInfo.contractAddress != address(0x0) &&
                lots[index].selling != lotType.None &&
                lots[index].selling != lotType.Auction,
            "You not send comission or lot not valid"
        );
        require(
            NFT_ERC20_Supports[lots[index].creationInfo.contractAddress][
                tokenAddress
            ] ==
                true ||
                tokenAddress == address(0x0),
            "Not Supported"
        );
        if (msg.value <= offerCommission) {
            if (lotIndex.length == 0) {
                // token
                require(
                    amount > 0 && msg.value == 0,
                    "You send 0 tokens or send token and crypto"
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
                            lots[lotIndex[i]].offered == false,
                        "You are not the owner or wrong lot"
                    );
                    lots[lotIndex[i]].offered = true;
                }
                if (tokenAddress != address(0)) {
                    // nft + token
                    require(
                        amount > 0 || msg.value == offerCommission,
                        "You send 0 tokens or don't send commission"
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
                    //nft
                    require(
                        msg.value == offerCommission,
                        "You don't send commission"
                    );
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
                            calculateCommission(
                                msg.value - offerCommission,
                                lots[index].creationInfo.contractAddress
                            ),
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
                            calculateCommission(
                                msg.value - offerCommission,
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
                payable(localOffer.owner).transfer(offerCommission);
            } else {
                payable(localOffer.owner).transfer(
                    localOffer.cryptoOffer.buyerPrice
                );
            }
        } else {
            payable(localOffer.owner).transfer(offerCommission);
            sendERC20(
                localOffer.cryptoOffer.contractAddress,
                address(this),
                localOffer.owner,
                localOffer.cryptoOffer.buyerPrice
            );
        }
        if (localOffer.lotsOffer.length != 0) {
            for (uint256 i = 0; i < localOffer.lotsOffer.length; i++) {
                returnNFT(localOffer.lotsOffer[i], "");
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
                    lot.creationInfo.contractAddress,
                    address(this),
                    lot.creationInfo.owner,
                    offerLot.creationInfo.id,
                    offerLot.creationInfo.amount,
                    data,
                    offerLot.isERC1155
                );
            }
        }
        if (userOffer.cryptoOffer.contractAddress == address(0)) {
            // crypto
            if (userOffer.cryptoOffer.sellerPrice != 0) {
                sendCrypto(
                    lot,
                    userOffer.cryptoOffer.sellerPrice,
                    userOffer.cryptoOffer.buyerPrice
                );
            } else {
                payable(marketWallet).transfer(offerCommission);
            }
        } else {
            // token
            sendERC20Price(userOffer.cryptoOffer.contractAddress, lot);
        }
        emit ChoosedOffer(lotID, offerID, block.timestamp);
    }

    function getLotsOffers(uint256 indexes)
        external
        view
        returns (uint256[] memory getLot)
    {
        getLot = lotOffers[indexes];
    }

    function getLots(uint256 indexes)
        external
        view
        returns (lotInfo memory getLot)
    {
        getLot = lots[indexes];
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
    ) external returns (bytes4) {
        require(
            NFT_Collections[msg.sender] == true,
            "This collection not supported"
        );
        if (operator != address(this)) {
            lots.push(
                lotInfo(
                    lotStart(operator, msg.sender, id, value, block.timestamp),
                    lotType.None,
                    0,
                    currency(address(0), 0, 0),
                    auctionInfo(0, 0, 0, 0, address(0)),
                    false,
                    true
                )
            );
            lotOwner[operator].push(lots.length - 1);
            emit AddNFT(
                operator,
                msg.sender,
                id,
                lots.length - 1,
                block.timestamp,
                value,
                uint256(lotType.None)
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
     * @param id, id of NFT which were sent.
     * @param data, data what can be added to transaction.
     * @notice Need for receive NFT721.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 id,
        bytes calldata data
    ) public virtual returns (bytes4) {
        require(
            NFT_Collections[msg.sender] == true,
            "This collection not supported"
        );
        if (operator != address(this)) {
            lots.push(
                lotInfo(
                    lotStart(operator, msg.sender, id, 1, block.timestamp),
                    lotType.None,
                    0,
                    currency(address(0), 0, 0),
                    auctionInfo(0, 0, 0, 0, address(0)),
                    false,
                    false
                )
            );
            lotOwner[operator].push(lots.length - 1);
            emit AddNFT(
                operator,
                msg.sender,
                id,
                lots.length - 1,
                block.timestamp,
                1,
                uint256(lotType.None)
            );
        }
        return
            bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
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
