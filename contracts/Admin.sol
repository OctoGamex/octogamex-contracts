pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./NFTMarketplace.sol";
import "./Auction.sol";

contract Admin is Ownable {
    Auction auctionContract;
    NFTMarketplace public marketplace;

    struct collectionInfo{
        uint256 commission;
        address owner;
    }

    uint256 public marketCommission; // Market comission in percents
    uint256 public offerCommission; // Fixed comission for create proposition

    mapping(address => bool) public NFT_Collections; // if return true, then NFT stay on this contract, else revert transaction
    mapping(address => mapping(address => bool)) public NFT_ERC20_Supports; // NFT address => ERC20 tokens address => does supported
    mapping(address => collectionInfo) public collections; // collection comission in percents
    mapping(address => bool) public collectionAdmin;
    mapping(address => bool) public commissionAdmin;

    event collectionAdd(
        address auctionContract,
        bool canTransfer
    );
    event commissionMarket(
        uint256 commisssion
    );
    event commissionOffer(
        uint256 commisssion
    );
    event commissionCollection(
        address contractNFT,
        uint256 commisssion
    );

    constructor(uint256 marketCommission, uint256 offerCommission) {
        setMarketCommission(marketCommission);
        setOfferCommission(offerCommission);
    }

    modifier onlyAdminCollection() {
        require(collectionAdmin[msg.sender] || msg.sender == owner(), "19");
        _;
    }

    modifier onlyAdminCommission() {
        require(commissionAdmin[msg.sender] || msg.sender == owner(), "19");
        _;
    }

    modifier checkContract(address contractAddress) {
        require(Address.isContract(contractAddress), "1");
        _;
    }

    function setMarketContract(address contractAddress) external onlyOwner {
        marketplace = NFTMarketplace(contractAddress);
    }

    function setAuctionContract(address contractAddress) external onlyOwner {
        auctionContract = Auction(contractAddress);
    }

    function setCollectionAdmin(address _address, bool _isAdmin) external onlyOwner {
        require(_address != address(0) && _isAdmin != collectionAdmin[_address], "0");
        collectionAdmin[_address] = _isAdmin;
    }

    function setCommissionAdmin(address _address, bool _isAdmin) external onlyOwner {
        require(_address != address(0) && _isAdmin != commissionAdmin[_address], "0");
        commissionAdmin[_address] = _isAdmin;
    }

    /**
    * @param contractAddress, NFT contract address which transfer NFT.
     * @param canTransfer, if true, then we can take NFT from this contract, else revert transaction.
     * @notice setter for NFT collection support.
     */
    function setNFT_Collection(address contractAddress, bool canTransfer) external onlyAdminCollection checkContract(contractAddress) {
        NFT_Collections[contractAddress] = canTransfer;
        marketplace.setNFT_Collection(contractAddress);
        emit collectionAdd(contractAddress, canTransfer);
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
    ) external onlyAdminCollection checkContract(NFT_Address) {
        for (uint256 i = 0; i < ERC20_Address.length; i++) {
            require(Address.isContract(ERC20_Address[i]), "1");
            ERC20(ERC20_Address[i]).name();
            ERC20(ERC20_Address[i]).symbol();
            NFT_ERC20_Supports[NFT_Address][ERC20_Address[i]] = canTransfer[i];
        }
    }

    /**
 * @param commission, percents what pay users of ERC20 tokens and cryptocurrency.
     * 100 = 10 %.
     * 1000 = 100 %.
     */
    function setMarketCommission(uint256 commission) public onlyAdminCommission {
        require(commission <= 1000, "4");
        marketCommission = commission;
        emit commissionMarket(marketCommission);
    }

    /**
     * @param comission, amount of cryptocurrency what users pay for offers.
     */
    function setOfferCommission(uint256 comission) public onlyAdminCommission {
        offerCommission = comission;
        emit commissionOffer(offerCommission);
    }

    function setCollectionCommission(address contractNFT, uint256 commission) external onlyAdminCommission {
        require(NFT_Collections[contractNFT] && collections[contractNFT].owner != address(0), "2");
        require(commission <= 1000, "4");
        collections[contractNFT].commission = commission;
        emit commissionCollection(contractNFT, commission);
    }

    function setCollectionOwner(address contractAddress, address owner) external onlyAdminCommission {
        require(
            NFT_Collections[contractAddress] && owner != address(0),
            "2"
        );
        collections[contractAddress].owner = owner;
    }
}
