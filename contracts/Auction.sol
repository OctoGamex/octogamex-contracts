//SPDX-License-Identifier: MIT

pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./NFTMarketplace.sol";
import "./VariableType.sol";
import "./Admin.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Auction is Ownable, Pausable, VariablesTypes {
    NFTMarketplace public marketplace;
    Admin adminContract;

    constructor(address market, address admin) {
        marketplace = NFTMarketplace(market);
        adminContract = Admin(admin);
    }

    event AuctionStart(
        uint256 indexed startDate,
        uint256 indexed id,
        address indexed owner,
        uint256 priceInitial,
        uint256 priceStepPercent,
        uint256 deadline,
        address tokenAddress
    );
    event BidMaked(
        uint256 indexed dateTime,
        uint256 indexed lotID,
        address indexed user,
        uint256 amount
    );
    event AuctionEnd(
        uint256 indexed dateTime,
        uint256 indexed lotID,
        uint256 amount,
        bool isCanceled
    );

    function time() external view returns (uint256) {
        return block.timestamp;
    }

    function createAuction(
        address contractAddress,
        uint256 id,
        uint256 value,
        bool isERC1155,
        uint256 startDate,
        uint256 endDate,
        uint256 step,
        address tokenAddress,
        uint256 amount,
        bytes memory data
    ) external whenNotPaused {
        if (isERC1155 == true) {
            ERC1155 NFT_Contract = ERC1155(contractAddress);
            NFT_Contract.safeTransferFrom(msg.sender, address(marketplace), id, value, data);
        } else {
            ERC721 NFT_Contract = ERC721(contractAddress);
            NFT_Contract.safeTransferFrom(msg.sender, address(marketplace), id, data);
        }
        uint256 lotID = marketplace.getLotsLength() - 1;
        startAuction(lotID, startDate, endDate, step, tokenAddress, amount);
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
    ) public whenNotPaused{
        lotInfo memory lot;
        (
            lot.creationInfo,
            lot.selling,
            lot.sellStart,
            lot.price,
            lot.auction,
            lot.offered,
            lot.isERC1155,
            lot.openForOffers
        ) = marketplace.lots(lotID);
        require(step >= 10, "step must be >= 10" );
        require(
            lot.creationInfo.owner == msg.sender && lot.selling == lotType.None && step <= 1000 && amount > 0,
            "You are not owner or too big a step or start price 0"
        );
        require(
            startDate < endDate,
            "Not correct start or end date"
        );

        if(startDate < block.timestamp){
            startDate = block.timestamp;
        }

        require(startDate - block.timestamp <= 2692000 && endDate - startDate <= 7998000, "18");
        require(
            adminContract.NFT_ERC20_Supports(
                lot.creationInfo.contractAddress,
                tokenAddress
            ) ==
                true ||
                tokenAddress == address(0x0),
            "Not supported ERC20 tokens"
        );
        lot.selling = lotType.Auction;
        lot.auction = auctionInfo(
            startDate,
            endDate,
            step,
            amount,
            address(0x0)
        );
        if (tokenAddress == address(0x0)) {
            lot.price = currency(address(0x0), 0, 0);
        } else {
            lot.price = currency(tokenAddress, 0, 0);
        }
        marketplace.auctionLot(lotID, lot);
        emit AuctionStart(
            startDate,
            lotID,
            msg.sender,
            amount,
            step,
            endDate,
            tokenAddress
        );
    }

    /**
     * @param lotID, lot index in array.
     * @param amount, value of ERC20 tokens for bid.
     * @notice Make bid in auction.
     */
    function makeBid(uint256 lotID, uint256 amount) external payable whenNotPaused{
        lotInfo memory lot;
        (
            lot.creationInfo,
            lot.selling,
            lot.sellStart,
            lot.price,
            lot.auction,
            lot.offered,
            lot.isERC1155,
            lot.openForOffers
        ) = marketplace.lots(lotID);
        require(
            lot.auction.endAuction > block.timestamp &&
                lot.auction.startAuction <= block.timestamp && lot.selling == lotType.Auction,
            "Lot not on auction"
        );
        require(lot.auction.lastBid != msg.sender, "you are already the owner of the last bid");

        if (lot.price.contractAddress == address(0x0)) {
                require(msg.value >= lot.auction.nextStep, "Not enought payment");
                lot.auction.nextStep =
                    msg.value +
                    (msg.value * lot.auction.step) /
                    1000;
                if (lot.price.sellerPrice != 0) {
                    payable(lot.auction.lastBid).transfer(lot.price.buyerPrice);
                }
                lot.price = currency(
                    address(0x0),
                    msg.value -
                        (msg.value * adminContract.marketCommission()) /
                        1000,
                    msg.value
                );
                lot.auction.lastBid = msg.sender;
        } else {
            require(amount > 0, "You send 0 tokens!");
            ERC20 tokenContract = ERC20(lot.price.contractAddress);
            tokenContract.transferFrom(msg.sender, address(this), amount);
                require(amount >= lot.auction.nextStep, "Not enought payment");
                if (lot.price.sellerPrice != 0) {
                    tokenContract.transfer(
                        lot.auction.lastBid,
                        lot.price.buyerPrice
                    );
                }
                lot.price.buyerPrice = amount;
                lot.price.sellerPrice =
                    amount -
                    (amount * adminContract.marketCommission()) /
                    1000;
                lot.auction.nextStep =
                    amount +
                    (amount * lot.auction.step) /
                    1000;
                lot.auction.lastBid = msg.sender;
        }
        marketplace.auctionLot(lotID, lot);
        emit BidMaked(block.timestamp, lotID, msg.sender, msg.value != 0 ? msg.value : amount);
    }

    /**
     * @param lotID, NFT index in array.
     * @param data, data what can be added to transaction.
     * @notice Send bid to NFT owner, NFT to auction winner.
     */
    function endAuction(uint256 lotID, bytes memory data) external whenNotPaused {
        lotInfo memory lot;
        (
            lot.creationInfo,
            lot.selling,
            lot.sellStart,
            lot.price,
            lot.auction,
            lot.offered,
            lot.isERC1155,
            lot.openForOffers
        ) = marketplace.lots(lotID);
        require(lot.auction.endAuction <= block.timestamp && lot.selling == lotType.Auction, "Auction not ended");
        address marketWallet = marketplace.marketWallet();
        if (lot.isERC1155 == true) {
            ERC1155 nft_contract = ERC1155(lot.creationInfo.contractAddress);
            if (lot.price.sellerPrice == 0) {
                nft_contract.safeTransferFrom(
                    address(marketplace),
                    lot.creationInfo.owner,
                    lot.creationInfo.id,
                    lot.creationInfo.amount,
                    data
                );
            } else {
                nft_contract.safeTransferFrom(
                    address(marketplace),
                    lot.auction.lastBid,
                    lot.creationInfo.id,
                    lot.creationInfo.amount,
                    data
                );
            }
        } else {
            ERC721 nft_contract = ERC721(lot.creationInfo.contractAddress);
            if (lot.price.sellerPrice == 0) {
                nft_contract.safeTransferFrom(
                    address(marketplace),
                    lot.creationInfo.owner,
                    lot.creationInfo.id,
                    data
                );
            } else {
                nft_contract.safeTransferFrom(
                    address(marketplace),
                    lot.auction.lastBid,
                    lot.creationInfo.id,
                    data
                );
            }
        }
        if (lot.price.sellerPrice != 0) {
            (uint256 commission, address owner) = adminContract.collections(
                lot.creationInfo.contractAddress
            );
            uint256 marketCommission = adminContract.marketCommission();
            if (lot.price.contractAddress == address(0x0)) {
                payable(lot.creationInfo.owner).transfer(lot.price.sellerPrice);
                if (marketCommission > 0) {
                    payable(marketplace.marketWallet()).transfer(
                        (lot.price.buyerPrice * marketCommission) / 1000
                    );
                }
                if (commission > 0) {
                    payable(owner).transfer(
                        (lot.price.buyerPrice * commission) / 1000
                    );
                }
            } else {
                ERC20 tokenContract = ERC20(lot.price.contractAddress);
                tokenContract.transfer(
                    lot.creationInfo.owner,
                    lot.price.sellerPrice
                );
                if (marketCommission > 0) {
                    tokenContract.transfer(
                        marketWallet,
                        (lot.price.buyerPrice *
                            adminContract.marketCommission()) / 1000
                    );
                }
                if (commission > 0) {
                    tokenContract.transfer(
                        owner,
                        (lot.price.buyerPrice * commission) / 1000
                    );
                }
            }
        }
        delete lot;
        marketplace.auctionLot(lotID, lot);
        emit AuctionEnd(block.timestamp, lotID, lot.creationInfo.amount, false);
    }

    function finishAuction(uint256 lotID, bytes memory data) external whenNotPaused {
        lotInfo memory lot;
        (
            lot.creationInfo,
            lot.selling,
            lot.sellStart,
            lot.price,
            lot.auction,
            lot.offered,
            lot.isERC1155,
            lot.openForOffers
        ) = marketplace.lots(lotID);
        require(lot.price.sellerPrice == 0 && lot.selling == lotType.Auction, "Lot have bid");
        if (lot.isERC1155 == true) {
            ERC1155 nft_contract = ERC1155(lot.creationInfo.contractAddress);
            nft_contract.safeTransferFrom(
                address(marketplace),
                lot.creationInfo.owner,
                lot.creationInfo.id,
                lot.creationInfo.amount,
                data
            );
        } else {
            ERC721 nft_contract = ERC721(lot.creationInfo.contractAddress);
            nft_contract.safeTransferFrom(
                address(marketplace),
                lot.creationInfo.owner,
                lot.creationInfo.id,
                data
            );
        }
        delete lot;
        marketplace.auctionLot(lotID, lot);
        emit AuctionEnd(block.timestamp, lotID, lot.creationInfo.amount, true);
    }

    function setPause() public onlyOwner{
        _pause();
    }

    function unPause() public onlyOwner{
        _unpause();
    }
}
