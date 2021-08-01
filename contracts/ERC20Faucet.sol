// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

import "hardhat/console.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; // OZ contracts v4
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // OZ contracts v4

import "./IERC20Minter.sol";

contract ERC20Faucet is ReentrancyGuard {
    // using SafeERC20 for IERC20;

    uint256 public constant DAY = 24 * 60 * 60;

    address public token;

    uint256 public constant TOTAL_MAX_AMOUNT = 10 * 1000 * 1000;
    uint256 public constant DAILY_MAX_AMOUNT = 100 * 1000;

    struct User {
        uint256 totalAmount;
        uint256 dailyAmount;
        uint256 lastTxTime;
    }

    mapping(address => User) public userMap;

    event TokenSent(uint256 amount);

    constructor(address _token) {
        token = _token;
    }

    function requestToken(uint256 amount) external nonReentrant {
        User storage user = userMap[msg.sender];

        user.totalAmount += amount;
        require(user.totalAmount <= TOTAL_MAX_AMOUNT, "request exceeds total maximum");

        user.dailyAmount = (block.timestamp / DAY - user.lastTxTime / DAY >= 1) ? amount : user.dailyAmount + amount;
        require(user.dailyAmount <= DAILY_MAX_AMOUNT, "request exceeds daily maximum");

        user.lastTxTime = block.timestamp;

        IERC20Minter(token).mint(msg.sender, amount);
        emit TokenSent(amount);
    }
}
