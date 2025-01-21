import { GameAPI } from "./gapi.js";
import { Tile } from "./tile.js";

const allTiles = document.querySelectorAll(".tile"); // Select all tiles
const startGameOverlay = document.getElementById("gameStartOverlay");
const startGameButton = document.getElementById("startGameButton");
const nameField = document.getElementById("nameInput");
const api = new GameAPI("http://localhost:8080");
var playerToken = "";
const tileInstances = {};

const gameMap = {
  NW: document.getElementById("NW"),
  NN: document.getElementById("NN"),
  NE: document.getElementById("NE"),
  WW: document.getElementById("WW"),
  CE: document.getElementById("CE"),
  EE: document.getElementById("EE"),
  SW: document.getElementById("SW"),
  SS: document.getElementById("SS"),
  SE: document.getElementById("SE"),
};

const inputMap = {
  NN: "north",
  WW: "west",
  EE: "east",
  SS: "south",
  CE: "stay",
  NW: null,
  NE: null,
  SW: null,
  SE: null,
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
  for (const key in tileInstances) {
    tileInstances[key].setActive(false);
  }
  //Activate the new one
  tileInstances[event.target.id].setActive(true);
  //Send planned move to server
  if (inputMap[event.target.id]) {
    api.setPlayerDirection(inputMap[event.target.id]);
  }
}

startGameButton.addEventListener("click", startGame);

Object.entries(gameMap).forEach(([key, val]) =>
  val.addEventListener("click", (event) => tileClicked(event)),
);

document.addEventListener("DOMContentLoaded", () => {
  const tileImages = [
    "img/forest.jpg",
    "img/farm.jpg",
    "img/city.jpg",
    "img/laboratory.jpg",
  ];
  allTiles.forEach((tileDiv) => {
    const tile = new Tile(tileDiv, tileImages);
    tileInstances[tileDiv.id] = tile;
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
