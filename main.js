import { GameAPI } from "./gapi.js";
import { Tile } from "./tile.js";

const allTiles = document.querySelectorAll(".tile"); // Select all tiles
const startGameOverlay = document.getElementById("gameStartOverlay");
const startGameButton = document.getElementById("startGameButton");
const nameField = document.getElementById("nameInput");
const api = new GameAPI("http://localhost:8080");
var playerToken;

const map = {
  NW: document.getElementById("NW"),
  NN: document.getElementById("NN"),
  NE: document.getElementById("NE"),
  WW: document.getElementById("WW"),
  EE: document.getElementById("EE"),
  SW: document.getElementById("SW"),
  SS: document.getElementById("SS"),
  SE: document.getElementById("SE"),
};

function hideOverlay() {
  startGameOverlay.style.display = "none"; //"flex" to show again
}

async function startGame() {
  hideOverlay();
  //Register Player and store token
  playerToken = await api.addPlayer(nameField.value);
  //Set up endpoint polling
}

function tileClicked(event) {
  //Deactive all tiles
  map.forEach((tile) => tile.setActive(false));
  //Activate the new one
  map[event.target.id].setActive(true);
  //Send planned move to server
  //TODO
}

startGameButton.addEventListener("click", startGame);

map.forEach((tile) => {
  tile.addEventListener("click", (event) => tileClicked(event));
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

async function getPlayer() {
  return await api.getPlayer(playerToken);
}

async function getConfig() {
  return await api.getAllConfig(playerToken);
}

async function updateSurroundings() {
  return await api.getSurroundings(playerToken);
}

async function pollingData() {
  const initialSurroundings = await getSurroundings();
  const initialConfig = await getConfig();
  const initialPlayer = await getPlayer();
}
