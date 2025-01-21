import { GameAPI } from "./gapi.js";

const grid3x3 = document.getElementById("grid3x3");
const grid2x2 = document.getElementById("grid2x2");

const allTiles = document.querySelectorAll(".tile"); // Select all tiles

allTiles.forEach((tile) => {
  tile.addEventListener("click", () => toggleColor(tile));
});

function toggleColor(tile) {
  tile.style.backgroundColor =
    tile.style.backgroundColor === "black" ? "white" : "black";
}

function changeRandomTileColor() {
  const randomIndex = Math.floor(Math.random() * allTiles.length); // Generate random index
  const randomTile = allTiles[randomIndex]; // Select random tile
  randomTile.style.opacity = 0.5; // Briefly reduce opacity
  toggleColor(randomTile);
  setTimeout(() => (randomTile.style.opacity = 1), 200);
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

setInterval(changeRandomTileColor, 5000); // Call function every 5 seconds
