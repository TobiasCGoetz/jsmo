import { GameAPI } from "./gapi.js";
import { Tile } from "./tile.js";

const allTiles = document.querySelectorAll(".tile"); // Select all tiles
const startGameOverlay = document.getElementById("gameStartOverlay");
const startGameButton = document.getElementById("startGameButton");

function hideOverlay() {
  startGameOverlay.style.display = "none"; //"flex" to show again
}

function startGame() {
  hideOverlay();
  //Register Player
  //Store token
  //Set up endpoint polling
}

startGameButton.addEventListener("click", hideOverlay);

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
