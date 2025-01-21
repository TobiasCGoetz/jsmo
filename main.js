import { GameAPI } from "./gapi.js";
import { Tile } from "./tile.js";

const updateSurroundingsInterval = 5000;
const updatePlayerInterval = 1000;
const updateConfigInterval = 2000;

const allTiles = document.querySelectorAll(".tile"); // Select all tiles
const startGameOverlay = document.getElementById("gameStartOverlay");
const startGameButton = document.getElementById("startGameButton");
const nameField = document.getElementById("nameInput");
const api = new GameAPI("http://localhost:8080");
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

const playerState = {
  Name: null,
  X: 0,
  Y: 0,
  Direction: "Stay",
  Play: "None",
  Consume: "None",
  Discard: "None",
  Cards: ["None", "None", "None", "None", "None"],
  Alive: false,
  IsBot: false,
};

const gameState = {
  TurnLength: 15,
  TurnTime: 15,
  HaveWon: false,
};

function hideOverlay() {
  startGameOverlay.style.display = "none"; //"flex" to show again
}

async function startGame() {
  hideOverlay();
  //Register Player and store token
  playerState.Name = nameField.value;
  await api.addPlayer(playerState.Name);
  //Set up data polling
  updateSurroundings();
  setInterval(updateSurroundings, updateSurroundingsInterval);
  setInterval(updatePlayer, updatePlayerInterval);
  setInterval(updateConfig, updateConfigInterval);
}

function deactiveAllTiles() {
  for (const key in tileInstances) {
    tileInstances[key].setActive(false);
  }
}

function tileClicked(event) {
  if (!inputMap[event.target.id]) {
    return;
  }
  deactiveAllTiles();
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
  const tileImages = {
    Forest: "img/forest.jpg",
    Farm: "img/farm.jpg",
    City: "img/city.jpg",
    Laboratory: "img/laboratory.jpg",
    EDGE: "img/edge.jpg",
  };
  allTiles.forEach((tileDiv) => {
    const tile = new Tile(tileDiv, tileImages);
    tileInstances[tileDiv.id] = tile;
  });
});

async function updatePlayer() {
  var newState = await api.getPlayer();
  for (const key in newState) {
    playerState[key] = newState[key];
  }
}

async function updateConfig() {
  var newConfig = await api.getAllConfig();
  for (const key in newConfig) {
    gameState[key] = newConfig[key];
  }
  console.log(gameState);
}

async function updateSurroundings() {
  var surroundings = await api.getPlayerSurroundings();
  for (const key in surroundings) {
    updateTile(key, surroundings[key]);
  }
}

async function updateTile(id, content) {
  tileInstances[id].updateByContent(content);
}
