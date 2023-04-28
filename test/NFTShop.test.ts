import {expect} from "chai";
import {ethers} from "hardhat";
import {loadFixture, time, setBalance} from "@nomicfoundation/hardhat-network-helpers";
import tokenArtefact from "../artifacts/contracts/NFTToken.sol/NFTToken.json";

describe("NFTShop", () => {
    async function deployFixture() {
        const [owner, buyer, buyer2, seller, hacker] = await ethers.getSigners();
        const ContractFactory = await ethers.getContractFactory("NFTShop");
        const mintedTokenCount = 10;
        const shop = await ContractFactory.deploy(mintedTokenCount);
        await shop.deployed();

        //new ethers.Contract( address , abi , signerOrProvider )
        const shopSigner = ContractFactory.signer;
        const token = new ethers.Contract(await shop.nftToken(), tokenArtefact.abi, shopSigner);

        const AttackFactory = await ethers.getContractFactory("ReentrancyAttack", hacker);
        const attack = await AttackFactory.deploy(shop.address, token.address);
        await attack.deployed();
        const attackSigner = AttackFactory.signer;
        return {owner, buyer, buyer2, seller, shop, token, hacker, attack, attackSigner}

    }

    // describe("ERC721Enumerable", () => {
    //
    //     it("totalSupply", async () => {
    //         const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
    //         expect(await token.totalSupply()).to.equal(mintedTokenCount)
    //     })
    //
    //     it("tokenByIndex", async () => {
    //         const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
    //         const tokenId = await token.tokenByIndex(1);
    //         console.log(tokenId);
    //         const tokenURI = await token.tokenURI(tokenId);
    //         console.log(tokenURI);
    //
    //         // console.log(await token.ownerOf(0))
    //         // console.log(shop.address)
    //         // console.log(await token.getArrayOfTokenIds(shop.address));
    //         // console.log(await token.getArrayOfTokenIds(owner.address));
    //     })
    // })

    describe("Token Price For Sell", () => {
        it("getTokenPriceForSell - correct value after deploy", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect(await shop.getTokenPriceForSell()).to.equal(90);
        })

        it("getTokenPriceForSell, setTokenPriceForSell - returns correct value after change", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForSell = 80;
            const setTokenPriceForSellTx = await shop.connect(owner).setTokenPriceForSell(newTokenPriceForSell);
            await setTokenPriceForSellTx.wait();
            expect(await shop.getTokenPriceForSell()).to.equal(newTokenPriceForSell);
        })

        it("setTokenPriceForSell - can only call owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForSell = 80;
            await expect(shop.connect(buyer).setTokenPriceForSell(newTokenPriceForSell))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setTokenPriceForSell - cannot be set 0", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForSell = 0;
            await expect(shop.connect(owner).setTokenPriceForSell(newTokenPriceForSell))
                .to.be.revertedWith("Token shop: price could not be equal 0");
        })

        it("setTokenPriceForSell - raises the SellPriceChange event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const oldPrice = (await shop.getTokenPriceForSell()).toNumber();
            const newTokenPriceForSell = 80;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            expect(await shop.connect(owner).setTokenPriceForSell(newTokenPriceForSell))
                .emit(shop, "SellPriceChange")
                .withArgs(oldPrice, newTokenPriceForSell, timestamp)
        })
    })

    describe("Token Price For Buy", () => {
        it("getTokenPriceForBuy - correct value after deploy", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect(await shop.getTokenPriceForBuy()).to.equal(100);
        })

        it("getTokenPriceForBuy, setTokenPriceForBuy - returns correct value after change", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 110;
            const setTokenPriceForBuyTx = await shop.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy);
            await setTokenPriceForBuyTx.wait();
            expect(await shop.getTokenPriceForBuy()).to.equal(newTokenPriceForBuy);
        })

        it("setTokenPriceForBuy - can only call owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 110;
            await expect(shop.connect(buyer).setTokenPriceForBuy(newTokenPriceForBuy))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setTokenPriceForBuy - cannot be set 0", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 0;
            await expect(shop.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy))
                .to.be.revertedWith("Token shop: price could not be equal 0");
        })

        it("setTokenPriceForBuy - raises the BuyPriceChange event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const oldPrice = (await shop.getTokenPriceForBuy()).toNumber();
            const newTokenPriceForBuy = 110;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            expect(await shop.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy))
                .emit(shop, "BuyPriceChange")
                .withArgs(oldPrice, newTokenPriceForBuy, timestamp)
        })
    })

    describe("buyTokenFromShop", () => {

        it("Sending the wrong amount of ether generates the correct error", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            await expect(shop.connect(buyer).buyTokenFromShop(tokenId, {
                value: 10
            })).to.be.revertedWith("Token shop: not enough ethers for buy");
        })

        it("Buying a token that the shop does not own generates the correct error", async () => {
            const {owner, buyer, buyer2, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            // buyer покупает tokenId = 1
            const tx = await shop.connect(buyer).buyTokenFromShop(tokenId, {value: 100});
            await tx.wait();
            // buyer2 пытается купить tokenId = 1 которым магазин уже не владеет
            await expect(shop.connect(buyer2).buyTokenFromShop(tokenId, {
                value: 100
            })).to.be.revertedWith("NFTShop: shop not an owner of token with this id");
        })

        it("Buying a token correctly changes the buyer's and shop's ether balance", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const value = 100;
            await expect(shop.connect(buyer).buyTokenFromShop(tokenId, {value}))
                .to.changeEtherBalances([buyer, shop], [-value, +value]);
        })

        it("After buying a token, the buyer becomes its owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const value = 100;
            const tx = await shop.connect(buyer).buyTokenFromShop(tokenId, {value});
            await tx.wait();
            expect(await token.ownerOf(tokenId)).to.equal(buyer.address);
        })

        it("Buying a token fires the correct event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const value = 100;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(buyer).buyTokenFromShop(tokenId, {value}))
                .emit(shop, "BuyFromShop")
                .withArgs(buyer.address, tokenId, value, timestamp);
        })
    })

    describe("sellTokenToShop", () => {

        it("Selling a token that the seller does not own generates the correct error", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            await expect(shop.connect(seller).sellTokenToShop(1))
                .to.be.revertedWith("NFTShop: seller is not an owner of token");
        })

        it("If the shop does not have permission to transfer the seller's token, an appropriate error is generated", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const value = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value});
            await tx.wait();
            // продает
            await expect(shop.connect(seller).sellTokenToShop(tokenId))
                .to.be.revertedWith("NFTShop: shop has not approval to token")
        })

        it("Selling a token correctly changes the seller and shop ether balances", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const value = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value});
            await tx.wait();

            // разрешает
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();

            // продает
            const sellPrice = 90;
            await expect(shop.connect(seller).sellTokenToShop(tokenId))
                .to.changeEtherBalances([seller, shop], [+sellPrice, -sellPrice]);
        })

        it("If the shop does not have enough ether to buy, a corresponding error is generated", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);

            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();

            // баланс магазина равен buyValue
            expect(await shop.connect(owner).getShopBalance()).to.equal(buyValue)

            // меняем цену продажи на 200.
            // теперь при продажи токена магазин должен заплатить 200 а в наличие есть только 100
            const changeSellPriceTx = await shop.connect(owner).setTokenPriceForSell(200);
            await changeSellPriceTx.wait();

            // разрешает
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();

            // продаем
            await expect(shop.connect(seller).sellTokenToShop(tokenId))
                .to.be.revertedWith("NFTShop: shop does not have enough ether")
        })

        it("After the token is sold to the shop, the shop becomes its owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);

            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();

            // владелец токена - seller
            expect(await token.ownerOf(tokenId)).to.equal(seller.address);

            // разрешает
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();

            // продает
            const sellTx = await shop.connect(seller).sellTokenToShop(tokenId);
            await sellTx.wait();

            // владелец - снова магазин
            expect(await token.ownerOf(tokenId)).to.equal(shop.address);
        })

        it("Selling a token to a shop fires the correct event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);

            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();

            // разрешает
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();

            const priceSell = await shop.getTokenPriceForSell();
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);


            await expect(shop.connect(seller).sellTokenToShop(tokenId))
                .emit(shop, "SellToShop")
                .withArgs(seller.address, tokenId, priceSell, timestamp);
        })

    });

    describe("addTokenToAuction", () => {

        it("Account putting the token up for auction must own it", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const price = 200;
            await expect(shop.connect(seller).addTokenToAuction(tokenId, price))
                .to.be.revertedWith("NFTShop: is not an owner of token");
        })

        it("Price cannot be equal to 0", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const price = 0;
            await expect(shop.connect(seller).addTokenToAuction(tokenId, price))
                .to.be.revertedWith("NFTShop: price can not be equal 0");
        });

        it("You can't resubmit the same token", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const price = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, price);
            await addTokenToAuctionTx.wait();
            // повторно выставляем
            await expect(shop.connect(seller).addTokenToAuction(tokenId, price))
                .to.be.revertedWith("NFTShop: token already on auction");
        });

        it("The correct object is added to the auctions array", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // проверка
            const auctions = await shop.getAuctions();
            const auction = auctions[auctions.length - 1];
            expect(auction.tokenId).to.equal(tokenId);
            expect(auction.seller).to.equal(seller.address);
            expect(auction.startAt).to.equal(timestamp);
            expect(auction.price).to.equal(auctionPrice);
        })

        it("When adding a token to the auction, the correct event is generated with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            const auctionPrice = 200;
            await expect(shop.connect(seller).addTokenToAuction(tokenId, auctionPrice))
                .emit(shop, "AddTokenToAuction")
                .withArgs(tokenId, seller.address, timestamp, auctionPrice);
        })

    })

    describe("removeTokenFromAuction", () => {

        it("The account that removes the token from the auction must own it", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // теперь другой аккаунт buyer хочет его удалить с аукциона
            await expect(shop.connect(buyer).removeTokenFromAuction(tokenId))
                .to.be.revertedWith("NFTShop: is not an owner of token")
        })

        it("The token must already be put up for auction", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // seller пытается его удалить с аукциона
            await expect(shop.connect(seller).removeTokenFromAuction(tokenId))
                .to.be.revertedWith("NFTShop: token not on auction")
        })

        it("Removing a token from the auction removes it from the array 'auctions'", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            //
            const lengthBefore = (await shop.getAuctions()).length;
            // удаляем с аукциона
            const removeTx = await shop.connect(seller).removeTokenFromAuction(tokenId);
            await removeTx.wait();
            const lengthAfter = (await shop.getAuctions()).length;
            expect(lengthBefore - lengthAfter).to.equal(1);
        })

        it("Removing a token from the auction generates the correct event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // удаляем с аукциона
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(seller).removeTokenFromAuction(tokenId))
                .emit(shop, "RemoveTokenFromAuction")
                .withArgs(tokenId, seller.address, timestamp);
        })
    })

    describe("buyTokenFromAuction", () => {

        it("Token must be put up for auction", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // seller разрешает магазину управлять им (но при этом не выставляет его на аукцион)
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer пытается его купить
            await expect(shop.connect(buyer).buyTokenFromAuction(tokenId, {value: 200}))
                .to.be.revertedWith("NFTShop: token not on auction");
        })

        it("Buyer does not have to be the owner of the token", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // seller пытается его сам купить
            await expect(shop.connect(seller).buyTokenFromAuction(tokenId))
                .to.be.revertedWith("NFTShop: buyer could not be a seller");
        })

        it("Buyer must send the required amount of ether", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // seller разрешает магазину управлять им
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer пытается его купить
            await expect(shop.connect(buyer).buyTokenFromAuction(tokenId, {value: 199}))
                .to.be.revertedWith("Token shop: not enough ethers for buy");
        })

        it("Shop must have permission to transfer the token from the owner to the buyer", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион (но не разрешает)
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // buyer пытается его купить
            await expect(shop.connect(buyer).buyTokenFromAuction(tokenId, {value: auctionPrice}))
                .to.be.revertedWith("NFTShop: shop has not approval to token");
        })

        it("After buying a token at an auction, the buyer becomes its owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // seller разрешает магазину управлять им
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer его покупает
            const buyOnAuctionTx = await shop.connect(buyer).buyTokenFromAuction(tokenId, {value: auctionPrice});
            await buyOnAuctionTx.wait();
            // проверяем владельца
            expect(await token.ownerOf(tokenId)).to.equal(buyer.address);
        })

        it("Buying a token at an auction correctly changes the balance of the ether of the shop, seller and buyer", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // seller разрешает магазину управлять им
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer его покупает
            await expect(shop.connect(buyer).buyTokenFromAuction(tokenId, {value: auctionPrice}))
                .to.changeEtherBalances(
                    [seller, shop, buyer],
                    [
                        auctionPrice - Math.floor(auctionPrice * 0.05),
                        Math.floor(auctionPrice * 0.05),
                        -auctionPrice,
                    ]
                )
        })

        it("When buying a token, the auction object is removed from the array {auctions}", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            const lengthBefore = (await shop.getAuctions()).length;
            // seller разрешает магазину управлять им
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer его покупает
            const buyFromAuctionTx = await shop.connect(buyer).buyTokenFromAuction(tokenId, {value: auctionPrice});
            await buyFromAuctionTx.wait();
            const lengthAfter = (await shop.getAuctions()).length;
            expect(lengthBefore - lengthAfter).to.equal(1);
        })

        it("When buying a token at auction, the correct event is generated with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // seller разрешает магазину управлять им
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer его покупает
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(buyer).buyTokenFromAuction(tokenId, {value: auctionPrice}))
                .emit(shop, "BuyTokenFromAuction")
                .withArgs(tokenId, auctionPrice, buyer.address, timestamp)
        })
    })

    describe("isTokenOnAuction", () => {

        it("Returns false for tokens that were not auctioned", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            expect(await shop.isTokenOnAuction(tokenId)).to.equal(false);
        })

        it("Returns true for the token that was auctioned", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            expect(await shop.isTokenOnAuction(tokenId)).to.equal(true);
        })

        it("Returns false for a token that was removed from the auction", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // isTokenOnAuction = true
            expect(await shop.isTokenOnAuction(tokenId)).to.equal(true);
            // seller разрешает магазину управлять им
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // seller удаляет с аукциона
            const removeTx = await shop.connect(seller).removeTokenFromAuction(tokenId);
            await removeTx.wait();
            // isTokenOnAuction = false
            expect(await shop.isTokenOnAuction(tokenId)).to.equal(false);
        })

        it("Returns false for the token that was bought from the auction", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // isTokenOnAuction = true
            expect(await shop.isTokenOnAuction(tokenId)).to.equal(true);
            // seller разрешает магазину управлять им
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer его покупает
            const buyFromAuctionTx = await shop.connect(buyer).buyTokenFromAuction(tokenId, {value: auctionPrice});
            await buyFromAuctionTx.wait();
            // isTokenOnAuction = false
            expect(await shop.isTokenOnAuction(tokenId)).to.equal(false);
        })
    })

    describe("getAuctionPrice", () => {
        it("Returns the correct value", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // seller покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(seller).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // выставляет на аукцион
            const auctionPrice = 200;
            const addTokenToAuctionTx = await shop.connect(seller).addTokenToAuction(tokenId, auctionPrice);
            await addTokenToAuctionTx.wait();
            // getAuctionPrice => 200
            expect(await shop.getAuctionPrice(tokenId)).to.equal(auctionPrice);
            // seller разрешает магазину управлять им
            const approveTx = await token.connect(seller).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer его покупает
            const buyFromAuctionTx = await shop.connect(buyer).buyTokenFromAuction(tokenId, {value: auctionPrice});
            await buyFromAuctionTx.wait();
            // getAuctionPrice => 0
            expect(await shop.getAuctionPrice(tokenId)).to.equal(0);
        })
    })

    describe("getShopBalance", () => {

        it("Returns the correct value after buy a token from a shop", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // getShopBalance => 0
            expect(await shop.getShopBalance()).to.equal(0);
            // buyer покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(buyer).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // getShopBalance => buyValue (100)
            expect(await shop.getShopBalance()).to.equal(buyValue);
        })

        it("Returns the correct value after sell a token to a shop", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            // getShopBalance => 0
            expect(await shop.getShopBalance()).to.equal(0);
            // buyer покупает tokenId = 1
            const tokenId = 1;
            const buyValue = 100;
            const tx = await shop.connect(buyer).buyTokenFromShop(tokenId, {value: buyValue});
            await tx.wait();
            // getShopBalance => buyValue (100)
            expect(await shop.getShopBalance()).to.equal(buyValue);
            // buyer разрешает
            const approveTx = await token.connect(buyer).approve(shop.address, tokenId);
            await approveTx.wait();
            // buyer продает
            const sellPrice = 90;
            const sellTx = await shop.connect(buyer).sellTokenToShop(tokenId);
            await sellTx.wait();
            // getShopBalance => buyValue - sellPrice (100 - 90 = 10)
            expect(await shop.getShopBalance()).to.equal(buyValue - sellPrice);
        })
    })

    describe("withdrawAll", () => {
        it("Returns the correct value", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect(await shop.getShopBalance()).to.equal(0);
            await setBalance(shop.address, 1000);
            expect(await shop.getShopBalance()).to.equal(1000);
            const tx = await shop.connect(owner).withdrawAll();
            await tx.wait();
            expect(await shop.getShopBalance()).to.equal(0);
        })

    })
})
