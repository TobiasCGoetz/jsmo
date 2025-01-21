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
  //Set up endpoint polling later
  updateSurroundings();
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

/*
{
  "ID": "01948017-28cc-7d85-a569-1e742ea1c267",
  "Name": "tobi",
  "X": 35,
  "Y": 34,
  "Direction": "South",
  "Play": "None",
  "Consume": "None",
  "Discard": "None",
  "Cards": [
    "Food",
    "Wood",
    "Wood",
    "None",
    "None"
  ],
  "Alive": true,
  "IsBot": false
}
*/
async function updatePlayer() {
  var playerState = await api.getPlayer(playerToken);
  console.log(playerState);
}

async function getConfig() {
  return await api.getAllConfig(playerToken);
}

/*
{ NW: <Tile>, ... }

<Tile>===={
  "TileType": "Farm",
  "ZombieCount": 0,
  "PlayerCount": 1,
  "PlayersPlanMoveNorth": 0,
  "PlayersPlanMoveEast": 0,
  "PlayersPlanMoveSouth": 1,
  "PlayersPlanMoveWest": 0
}
*/
async function updateSurroundings() {
  var surroundings = await api.getPlayerSurroundings(playerToken);
  for (const key in surroundings) {
    updateTile(key, surroundings[key]);
  }
}

async function updateTile(id, content) {
  tileInstances[id].updateByContent(content);
}

async function pollingData() {
  const initialSurroundings = await getSurroundings();
  const initialConfig = await getConfig();
  const initialPlayer = await getPlayer();
}
