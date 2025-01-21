import { GameAPI } from "./gapi.js";
import { Tile } from "./tile.js";

const grid3x3 = document.getElementById("grid3x3");
const grid2x2 = document.getElementById("grid2x2");

const allTiles = document.querySelectorAll(".tile"); // Select all tiles

const overlay = document.getElementById("myOverlay");
const closeOverlayButton = document.getElementById("closeOverlay");

function showOverlay() {
  overlay.style.display = "flex";
}

function hideOverlay() {
  overlay.style.display = "none";
}

closeOverlayButton.addEventListener("click", hideOverlay);

allTiles.forEach((tile) => {
  tile.addEventListener("click", () => toggleColor(tile));
});

document.addEventListener("DOMContentLoaded", () => {
  const tiles = document.querySelectorAll(".tile");
  const tileInstances = [];
  const tileImages = [
    "img/forest.jpg",
    "img/farm.jpg",
    "img/city.jpg",
    "img/laboratory.jpg",
  ];
  tiles.forEach((tileElement) => {
    const tile = new Tile(tileElement, tileImages);
    tileInstances.push(tile);
  });
});

function toggleColor(tile) {
  tile.style.backgroundColor =
    tile.style.backgroundColor === "black" ? "white" : "black";
}
const api = new GameAPI("http://localhost:8080");

(async () => {
  try {
    // Add a player
    const playerToken = await api.addPlayer("PlayerName");
    console.log("Added Player:", playerToken);

    /* Get player details
    const playerDetails = await api.getPlayer(playerId);
    console.log("Player Details:", playerDetails);

    // Set direction
    await api.setPlayerDirection(playerId, "north");
    console.log("Direction set successfully");

    // Get configuration
    const config = await api.getAllConfig();
    console.log("Game Config:", config);
    */
  } catch (error) {
    console.error("API Error:", error);
  }
})();

/*
// To show the overlay:
document.getElementById("myOverlay").style.display = "flex";

// To hide the overlay:
document.getElementById("myOverlay").style.display = "none";
*/
