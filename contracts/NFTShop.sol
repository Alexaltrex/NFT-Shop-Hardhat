// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./NFTToken.sol";

contract NFTShop is Ownable, ERC721Holder {
    NFTToken public nftToken;
    // процент от выручки при продажи на аукцион, который перечисляется магазину
    uint public constant FEE = 5;

    uint _tokenPriceForSell = 90; // цена продажи магазину (wei / 1 Token)
    uint _tokenPriceForBuy = 100; // цена покупки у магазина (wei / 1 Token)

    struct Auction {
        uint tokenId;
        address seller;
        uint startAt;
        uint price;
    }

    // массив аукционов
    Auction[] public auctions;

    // отображение (tokenId => индекс_аукциона_токена_tokenId_в_массиве_auctions)
    mapping(uint => uint) auctionsIndex;
    // отображение (tokenId => выставлен_или_нет_на_аукционе)
    mapping(uint => bool) tokenOnAuction;

    event SellPriceChange(uint oldValue, uint newValue, uint timestamp);
    event BuyPriceChange(uint oldValue, uint newValue, uint timestamp);
    event BuyFromShop(address indexed buyer, uint tokenId, uint price, uint timestamp); // покупка токена
    event SellToShop(address indexed seller, uint tokenId, uint price, uint timestamp); // продажа токена
    event AddTokenToAuction(uint tokenId, address seller, uint startAt, uint price); // добавление токена на аукцион
    event RemoveTokenFromAuction(uint tokenId, address seller, uint timestamp); // удаление токена из аукциона
    event BuyTokenFromAuction(uint tokenId, uint price, address buyer, uint timestamp);

    constructor(uint mintedTokenCount) {
        nftToken = new NFTToken(mintedTokenCount);
        for (uint i = 0; i < mintedTokenCount; i++) {
            nftToken.safeMint(address(this));
        }
    }

    //========= GET TOKEN PRICE FOR SELL =========//
    function getTokenPriceForSell() public view returns (uint) {
        return _tokenPriceForSell;
    }

    //========= SET TOKEN PRICE FOR SELL =========//
    function setTokenPriceForSell(uint tokenPriceForSell_) external onlyOwner {
        require(tokenPriceForSell_ != 0, "Token shop: price could not be equal 0");
        emit SellPriceChange(_tokenPriceForSell, tokenPriceForSell_, block.timestamp);
        _tokenPriceForSell = tokenPriceForSell_;
    }

    //========= GET TOKEN PRICE FOR BUY =========//
    function getTokenPriceForBuy() public view returns (uint) {
        return _tokenPriceForBuy;
    }

    //========= SET TOKEN PRICE FOR BUY =========//
    function setTokenPriceForBuy(uint tokenPriceForBuy_) external onlyOwner {
        require(tokenPriceForBuy_ != 0, "Token shop: price could not be equal 0");
        emit BuyPriceChange(_tokenPriceForBuy, tokenPriceForBuy_, block.timestamp);
        _tokenPriceForBuy = tokenPriceForBuy_;
    }

    //========= BUY TOKEN FROM SHOP =========//
    function buyTokenFromShop(uint tokenId) external payable {
        // покупатель прислал необходимое количество денег
        require(msg.value == _tokenPriceForBuy, "Token shop: not enough ethers for buy");

        // у магазина есть в продаже токен [tokenId]
        require(nftToken.ownerOf(tokenId) == address(this), "NFTShop: shop not an owner of token with this id");

        // перевод токена [tokenId] из магазина к покупателю
        nftToken.safeTransferFrom(address(this), msg.sender, tokenId);

        emit BuyFromShop(msg.sender, tokenId, _tokenPriceForBuy, block.timestamp);
    }

    //========= BUY TOKEN FROM AUCTION =========//
    function buyTokenFromAuction(uint tokenId) external payable {
        // токен должен быть выставлен на аукционе
        require(tokenOnAuction[tokenId], "NFTShop: token not on auction");

        // покупатель не должен быть владельцем токена (зачем покупать у самого себя)
        address tokenOwner = nftToken.ownerOf(tokenId);
        require(tokenOwner != msg.sender, "NFTShop: buyer could not be a seller");

        uint price = auctions[auctionsIndex[tokenId]].price;

        // покупатель прислал необходимое количество денег
        require(msg.value == price, "Token shop: not enough ethers for buy");

        // магазин имеет разрешение переводить токен от владельца к покупателю
        require(nftToken.getApproved(tokenId) == address(this), "NFTShop: shop has not approval to token");

        // перевод токена [tokenId] от того, кто выставил его на аукционе к покупателю
        nftToken.safeTransferFrom(tokenOwner, msg.sender, tokenId);

        // возмещаем тому, кто выставил токен на аукционе, часть выручки (за вычетом % от продажи)
        // price = 95
        // (95 * 5) / 100 = 4.75
        (bool success,) = tokenOwner.call{value : price - ((price * FEE) / 100)}("");
        require(success, "NFTShop: transfer ether to seller failed");

        // удалить аукцион из массива аукционов
        _removeTokenFromAuction(tokenId);

        tokenOnAuction[tokenId] = false;
        emit BuyTokenFromAuction(tokenId, price, msg.sender, block.timestamp);
    }

    //========= SELL TOKEN TO SHOP =========//
    function sellTokenToShop(uint tokenId) external {
        // продавец токена - владеет им
        require(nftToken.ownerOf(tokenId) == msg.sender, "NFTShop: seller is not an owner of token");
        // магазин имеет разрешение переводить токен от владельца к себе
        require(nftToken.getApproved(tokenId) == address(this), "NFTShop: shop has not approval to token");
        // магазин имеет для покупки достаточное количество эфира
        require(address(this).balance >= _tokenPriceForSell, "NFTShop: shop does not have enough ether");

        // магазин переводит токены от продавца в магазин
        nftToken.safeTransferFrom(msg.sender, address(this), tokenId);

        // возмещаем продавцу деньги
        (bool success,) = msg.sender.call{value : _tokenPriceForSell}("");
        require(success, "NFTShop: transfer ether to seller failed");

        emit SellToShop(msg.sender, tokenId, _tokenPriceForSell, block.timestamp);
    }

    //========= ADD TOKEN TO AUCTION =========//
    // выставить токен на аукцион
    function addTokenToAuction(uint tokenId, uint price) external {
        // выставляющий токен на аукцион - владеет им
        require(nftToken.ownerOf(tokenId) == msg.sender, "NFTShop: is not an owner of token");
        // цена не может быть равна 0
        require(price != 0, "NFTShop: price can not be equal 0");
        // токен не дожен быть уже выставлен на аукционе
        require(!tokenOnAuction[tokenId], "NFTShop: token already on auction");

        // добавляем новый аукцион в auctionsIndex и auctions
        auctionsIndex[tokenId] = auctions.length;
        auctions.push(Auction(
                tokenId,
                msg.sender,
                block.timestamp,
                price
            ));
        tokenOnAuction[tokenId] = true;
        emit AddTokenToAuction(tokenId, msg.sender, block.timestamp, price);
    }

    //========= REMOVE TOKEN FROM AUCTION =========//
    // удалить токен с аукциона
    function removeTokenFromAuction(uint tokenId) external {
        // аккаунт удаляющий токен с аукциона - владеет им
        require(nftToken.ownerOf(tokenId) == msg.sender, "NFTShop: is not an owner of token");
        // токен уже дожен быть выставлен на аукционе
        require(tokenOnAuction[tokenId], "NFTShop: token not on auction");

        // удалить аукцион из массива аукционов
        _removeTokenFromAuction(tokenId);

        tokenOnAuction[tokenId] = false;
        emit RemoveTokenFromAuction(tokenId, msg.sender, block.timestamp);
    }

    //========= _REMOVE TOKEN FROM AUCTION =========//
    // удалить аукцион из массива аукционов - внутренняя служебная функция
    function _removeTokenFromAuction(uint tokenId) internal {
        // меняем местами последний и удаляемый элемент:
        // значение и индекс удаляемого Auction приравниваются значению и индексу последнего элемента в массиве auctions
        // а последний элемент и его индекс затем удаляются

        // индекс последнего Auction в массиве auctions
        uint lastAuctionIndex = auctions.length - 1;
        // индекс удаляемого Auction в массиве auctions
        uint deletedIndex = auctionsIndex[tokenId];

        // значение Auction последнего элемента в массиве auctions
        Auction memory lastAuction = auctions[lastAuctionIndex];

        // последний Auction в массиве auctions становится на место удаляемого Auction c заданным id
        auctions[deletedIndex] = lastAuction;
        // индекс последнего Auction в массиве auctions теперь равен индексу удаляемого Auction c заданным id
        auctionsIndex[lastAuction.tokenId] = deletedIndex;

        // обнуляем индекс удаляемого id
        delete auctionsIndex[tokenId];
        // удаляем последний элемент
        auctions.pop();
    }

    //========= IS TOKEN ON AUCTION =========//
    // возвращает выставлен или нет токен на аукционе
    function isTokenOnAuction(uint tokenId) public view returns (bool) {
        return tokenOnAuction[tokenId];
    }

    //========= GET AUCTIONS =========//
    function getAuctions() public view returns (Auction[] memory) {
        return auctions;
    }

    //========= GET AUCTION PRICE =========//
    function getAuctionPrice(uint tokenId) public view returns (uint) {
        if (tokenOnAuction[tokenId] == false) {
            return 0;
        }
        return auctions[auctionsIndex[tokenId]].price;
    }

    //========= GET SHOP BALANCE =========//
    function getShopBalance() public view onlyOwner returns (uint) {
        return address(this).balance;
    }

    //========= WITHDRAW ALL =========//
    function withdrawAll() public onlyOwner {
        address owner = owner();
        (bool success,) = owner.call{value : address(this).balance}("");
        require(success, "NFTShop: withdrawAll failed");
    }

}
