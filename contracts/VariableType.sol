//SPDX-License-Identifier: MIT

pragma solidity >=0.8.9;

interface VariablesTypes{
    enum lotType {
        None,
        FixedPrice,
        Auction,
        Exchange
    } // lot type

    struct collectionInfo{
        uint256 commission;
        address owner;
    }

    struct lotInfo {
        lotStart creationInfo;
        lotType selling;
        uint256 sellStart;
        currency price;
        auctionInfo auction;
        bool offered; // added to offer
        bool isERC1155;
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
        currency price;
    }

    struct returnInfo {
        address user;
        uint256 amount;
    }
}