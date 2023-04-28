// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFTToken is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;

    constructor(uint mintedTokenCount) ERC721("Wooden Soldiers NFT", "WST") {}

    function _baseURI() internal pure override returns (string memory) {
        //return "https://bafybeid5q3ojgncpahcgfs5nfyv65jhj4z6hnkmbfrrurrianfrb3lztti.ipfs.dweb.link/";
        return "https://w3s.link/ipfs/bafybeid5agz6quncuuauigrpm6gyiz7hyhb2rdl7reyriiflyrszjc7su4/";
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json")) : "";
    }

    function safeMint(address to) public onlyOwner {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    //    function getArrayOfTokenIds(address owner) public view returns (uint[] memory) {
    //        uint tokenCount = ERC721.balanceOf(owner);
    //        uint[] memory arr = new uint[](tokenCount);
    //
    //        for (uint i = 0; i < tokenCount; i++) {
    //            uint tokenId = ERC721Enumerable.tokenOfOwnerByIndex(owner, i);
    //            arr[i] = tokenId;
    //        }
    //        return arr;
    //    }
}
