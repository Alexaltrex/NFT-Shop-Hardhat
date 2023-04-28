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

    describe("ReentrancyAttack", () => {
        it("Attacker can buy token", async () => {
            const {owner, buyer, buyer2, seller, shop, token, hacker, attack} = await loadFixture(deployFixture);
            // buy
            const tokenId = 1;
            const tx = await attack.connect(hacker).buyTokenFromShop(tokenId, {value: 100});
            await tx.wait();
            //
            expect(await token.ownerOf(tokenId)).to.equal(attack.address);
        })

        it("Sell", async () => {
            const {owner, buyer, buyer2, seller, shop, token, hacker, attack, attackSigner} = await loadFixture(deployFixture);
            // set balance of shop
            await setBalance(shop.address, 1000);
            //expect(await attack.getBalance()).to.equal(1000);


            // buy
            console.log((await shop.getShopBalance()).toNumber());
            const tokenId = 1;
            const tx = await attack.connect(hacker).buyTokenFromShop(tokenId, {value: 100});
            await tx.wait();
            console.log((await shop.getShopBalance()).toNumber());

            // approve
            const approveTx = await attack
                .connect(hacker)
                .approve(shop.address, tokenId);
            await approveTx.wait();

            // sell
            const sellTx = await attack.connect(hacker).sellTokenToShop(tokenId);
            await sellTx.wait();
            console.log((await attack.getBalance()).toNumber());
            //console.log(await )
            //expect(await attack.getBalance()).to.equal(900);


        })


    })
})
