//SPDX-License-Identifier: MIT

pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./NFTMarketplace.sol";
import "./VariableType.sol";

contract Auction is VariablesTypes {
    NFTMarketplace public marketplace;

    constructor(address market) {
        marketplace = NFTMarketplace(market);
    }

    event AuctionStart(
        uint256 indexed dateTime,
        uint256 indexed id,
        address indexed owner,
        uint256 amount
    );
    event BidMaked(
        uint256 indexed dateTime,
        uint256 indexed lotID,
        address indexed user
    );
    event AuctionEnd(
        uint256 indexed dateTime,
        uint256 indexed lotID,
        uint256 amount
    );

    function time() external view returns (uint256) {
        return block.timestamp;
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
    ) public {
        lotInfo memory lot;
        (
            lot.creationInfo,
            lot.selling,
            lot.sellStart,
            lot.price,
            lot.auction,
            lot.offered,
            lot.isERC1155
        ) = marketplace.lots(lotID);
        require(
            lot.creationInfo.owner == msg.sender && step <= 1000 && amount > 0,
            "You are not owner or too big a step or start price 0"
        );
        require(
            startDate < endDate && startDate >= block.timestamp,
            "Not correct start or end date"
        );
        require(
            marketplace.NFT_ERC20_Supports(
                lot.creationInfo.contractAddress,
                tokenAddress
            ) ==
                true ||
                tokenAddress == address(0x0),
            "Not supported ERC20 tokens"
        );
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
            block.timestamp,
            lotID,
            msg.sender,
            lot.creationInfo.amount
        );
    }

    /**
     * @param lotID, lot index in array.
     * @param amount, value of ERC20 tokens for bid.
     * @notice Make bid in auction.
     */
    function makeBid(uint256 lotID, uint256 amount) external payable {
        lotInfo memory lot;
        (
            lot.creationInfo,
            lot.selling,
            lot.sellStart,
            lot.price,
            lot.auction,
            lot.offered,
            lot.isERC1155
        ) = marketplace.lots(lotID);
        require(
            lot.auction.endAuction > block.timestamp &&
                lot.auction.startAuction <= block.timestamp,
            "Lot not on auction"
        );
        if (lot.price.contractAddress == address(0x0)) {
            if (lot.auction.lastBid != msg.sender) {
                require(
                    msg.value >= lot.auction.nextStep,
                    "Not enought payment"
                );
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
                        (msg.value * marketplace.marketCommission()) /
                        1000,
                    msg.value
                );
                lot.auction.lastBid = msg.sender;
            } else {
                uint256 newPrice = lot.price.buyerPrice + msg.value;
                lot.price = currency(
                    address(0x0),
                    newPrice -
                        (newPrice * marketplace.marketCommission()) /
                        1000,
                    newPrice
                );
                lot.auction.nextStep =
                    newPrice +
                    (newPrice * lot.auction.step) /
                    1000;
            }
        } else {
            require(amount > 0, "You send 0 tokens!");
            ERC20 tokenContract = ERC20(lot.price.contractAddress);
            tokenContract.transferFrom(msg.sender, address(this), amount);
            if (lot.auction.lastBid != msg.sender) {
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
                    (amount * marketplace.marketCommission()) /
                    1000;
                lot.auction.nextStep =
                    amount +
                    (amount * lot.auction.step) /
                    1000;
                lot.auction.lastBid = msg.sender;
            } else {
                uint256 newPrice = lot.price.buyerPrice + amount;
                lot.price.buyerPrice = newPrice;
                lot.price.sellerPrice =
                    newPrice -
                    (newPrice * marketplace.marketCommission()) /
                    1000;
                lot.auction.nextStep =
                    newPrice +
                    (newPrice * lot.auction.step) /
                    1000;
            }
        }
        marketplace.auctionLot(lotID, lot);
        emit BidMaked(block.timestamp, lotID, msg.sender);
    }

    /**
     * @param lotID, NFT index in array.
     * @param data, data what can be added to transaction.
     * @notice Send bid to NFT owner, NFT to auction winner.
     */
    function endAuction(uint256 lotID, bytes memory data) external {
        lotInfo memory lot;
        (
            lot.creationInfo,
            lot.selling,
            lot.sellStart,
            lot.price,
            lot.auction,
            lot.offered,
            lot.isERC1155
        ) = marketplace.lots(lotID);
        require(lot.auction.endAuction <= block.timestamp, "Auction not ended");
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
            (uint256 commission, address owner) = marketplace.collections(
                lot.creationInfo.contractAddress
            );
            uint256 marketCommission = marketplace.marketCommission();
            if (lot.price.contractAddress == address(0x0)) {
                payable(lot.creationInfo.owner).transfer(lot.price.sellerPrice);
                if (marketCommission != 0) {
                    payable(marketplace.marketWallet()).transfer(
                        (lot.price.buyerPrice * marketCommission) / 1000
                    );
                }
                if (commission >= 0) {
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
                            marketplace.marketCommission()) / 1000
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
        emit AuctionEnd(block.timestamp, lotID, lot.creationInfo.amount);
    }

    function finishAuction(uint256 lotID, bytes memory data) external {
        lotInfo memory lot;
        (
            lot.creationInfo,
            lot.selling,
            lot.sellStart,
            lot.price,
            lot.auction,
            lot.offered,
            lot.isERC1155
        ) = marketplace.lots(lotID);
        require(lot.price.sellerPrice == 0, "Lot have bid");
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
        emit AuctionEnd(block.timestamp, lotID, lot.creationInfo.amount);
    }
}
