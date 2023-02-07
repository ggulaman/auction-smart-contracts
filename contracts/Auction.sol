// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import './AuctionERC20.sol';

/**
 * @title Auction
 * @author ggulaman
 * @notice Smart Contract (SC) which handles an Auction
 * @dev TODO: 1. Check which functions should not be public | 2. Import the OpenZeppelin Owner SC | 3. OpenZeppelin maths | 4. Check Licences
 * @dev TODO: 5. Consider to destroy SC once they are completed | 6. Add OpenZeppelin Upgrade
 */
contract Auction {
    // EVENTS
    event UserPlacedBid(address indexed user, uint256 indexed amount); // Raised when a New Bid is Placed
    event UserRefund(address indexed user, bytes indexed receipt); // Raised when User receives their previosuly staked ETH amount
    event AuctionClaimed(address indexed claimer, address indexed winner); // Raised when the Winner or the Owner Want to Wrap up the action
    event ERC20Sent(address indexed _from, address indexed _destAddr, uint indexed _amount); // Raised when ERC20 tokens are sent
    event ETHSentToOwner(address indexed _destAddr, bytes indexed _receipt); // Raised when ETH sent to owner

    // SC VARIABLES
    AuctionERC20 erc20;
    address private auctionOwner; // address of the Auction Owner
    address private auctionWinner; // address of the Action Winner
    uint256 private auctionDeadline; // epoch time when the auction finishes
    uint256 private minBidIncrement; // min. increment amount of a bid, compare to the previous one
    uint256 private minPrice; // starting price of the auction
    uint256 private currentPrice; // current price of the Auction

    /**
     * @dev Constructor that creates the ERC20 token
     */
    constructor (address _owner, uint256 _minBidIncrement, uint256 _minPrice, uint256 _auctionDuration, string memory _ERC20Name, string memory _ERC20Symbol, uint256 _supply) {
        auctionOwner = _owner;
        auctionDeadline = _auctionDuration + block.timestamp;
        minBidIncrement = _minBidIncrement;
        minPrice = _minPrice;
        currentPrice = _minPrice - minBidIncrement;
        erc20 = new AuctionERC20(_ERC20Name, _ERC20Symbol, _supply, address(this));
    }

    /**
     * @notice Returns the address of the ERC20 Token
     * @return the address of the erc20 ERC20 SC
     */
    function getERC20address() public view returns (address) {
        return address(erc20);
    }

    /**
     * @notice Returns the Auction Owner for now
     * @return auctionOwner
     */
    function getAuctionOwner() public view returns (address) {
        return auctionOwner;
    }

    /**
     * @notice Returns the Auction Winner for now
     * @return auctionWinner
     */
    function getAuctionWinner() public view returns (address) {
        return auctionWinner;
    }

    /**
     * @notice Returns deadline in epoch time
     * @return auctionDeadline
     */
    function getAuctionDeadline() public view returns (uint256) {
        return auctionDeadline;
    }

    /**
     * @notice Returns the min. increment for a bid
     * @return minBidIncrement
     */
    function getMinBidIncrement() public view returns (uint256) {
        return minBidIncrement;
    }

    /**
     * @notice Returns the starting price of the bid
     * @return minPrice
     */
    function getMinPrice() public view returns (uint256) {
        return minPrice;
    }

    /**
     * @notice Returns the current higher bid offer
     * @return currentPrice
     */
    function getCurrentPrice() public view returns (uint256) {
        return currentPrice;
    }

    /**
     * @notice Calculates the min. amount of the next bid
     * @return add up of currentPrice and minBidIncrement
     */
    function getNextPossibleBid() public view returns (uint256) {
        return currentPrice + minBidIncrement;
    }

    /**
     * @notice Returns if the Auction is still open
     * @return True if auction deadline is greater than the current block timestamp
     */
    function getIfAuctionIsActive() public view returns (bool) {
        return auctionDeadline > block.timestamp;
    }

    /**
     * @notice Send the last bid amount to the user who placed it, after a greater bid is placed
     */
    function sendBackPreviousFunds() private {
        (bool sent, bytes memory data) = auctionWinner.call{value: currentPrice}("");
        require(sent, "Failed to send Ether");
        emit UserRefund(auctionOwner, data);
    }

    /**
     * @notice Function to place a bid with ETH
     */
    function auctionBid() public payable {
        require(msg.sender != auctionOwner, "Owner cannot deposit");
        require(msg.value >= getNextPossibleBid(), "Low stake");
        require(block.timestamp <= auctionDeadline, "auction finished");

        if (currentPrice >= minPrice) {
            sendBackPreviousFunds();
        }

        auctionWinner = msg.sender;
        currentPrice = msg.value;
        emit UserPlacedBid(msg.sender, msg.value);
    }

    /**
     * @notice Function to transfer the ERC20 tokens to the winner
     */
    function transferERC20() private {
        IERC20 erc20Token = IERC20(getERC20address());
        uint256 erc20balance = erc20Token.balanceOf(address(this));
        erc20Token.transfer(auctionWinner, erc20balance);
        emit ERC20Sent(msg.sender, auctionWinner, erc20balance);
    }

    /**
     * @notice Transfers the Final Auction Eth amount to the Auction Owner
     */
    function transferEthToFactory() private {
        (bool sent, bytes memory data) = auctionOwner.call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
        emit ETHSentToOwner(auctionOwner, data);
    }

    /**
     * @notice Function to claim the Bid and triggers the functions to send the ERC20 to the winner and the ETH to the Auction Owner
     */
    function claimBid() public payable {
        require(msg.sender == auctionWinner || msg.sender == auctionOwner, "Only owner and winner can claim");
        require(!getIfAuctionIsActive(), "auction is running");
        transferERC20();
        transferEthToFactory();
        emit AuctionClaimed(msg.sender, auctionWinner);
    }
}