import { GameAPI } from "./gapi.js";
import { Tile } from "./tile.js";
import { Card, findIdOfCardForType } from "./card.js";

const updateSurroundingsInterval = 5000;
const updatePlayerInterval = 1000;
const updateConfigInterval = 2000;

const allTiles = document.querySelectorAll(".tile");
const allCards = document.querySelectorAll(".card");
const startGameOverlay = document.getElementById("gameStartOverlay");
const startGameButton = document.getElementById("startGameButton");
const nameField = document.getElementById("nameInput");
const api = new GameAPI("http://localhost:8080");
const tileInstances = {};
const cardInstances = {};

const directions = ["NW", "NN", "NE", "WW", "CE", "EE", "SW", "SS", "SE"];

const tileImages = {
  Forest: "img/forest.jpg",
  Farm: "img/farm.jpg",
  City: "img/city.jpg",
  Laboratory: "img/laboratory.jpg",
  EDGE: "img/edge.jpg",
};

const cardImages = {
  Food: "img/food.jpg",
  Wood: "img/wood.jpg",
  Weapon: "img/gun.jpg",
  Research: "img/dna.jpg",
  None: "img/none.jpg",
};

const directionMap = {
  NN: "north",
  WW: "west",
  EE: "east",
  SS: "south",
  CE: "stay",
  north: "NN",
  west: "WW",
  east: "EE",
  south: "SS",
  stay: "CE",
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

function updateFromPlayerState() {
  //Let this handle "active" indication of cards
  //Let this handle "active" indication of tiles, requires a reverse-lookup of inputMap currently
  for (var i = 0; i < Object.keys(cardInstances).length; i++) {
    cardInstances["bp" + i.toString()].updateType(playerState["Cards"][i]);
  }
  deactivateAll(tileInstances);
  deactivateAll(cardInstances);
  var heading = directionMap[playerState["Direction"].toLowerCase()];
  tileInstances[heading].setActive(true);
  cardInstances[
    findIdOfCardForType(cardInstances, playerState["Consume"])
  ].toggle();
  cardInstances[
    findIdOfCardForType(cardInstances, playerState["Play"])
  ].toggle();
}

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

function deactivateAll(instances) {
  for (const key in instances) {
    instances[key].setActive(false);
  }
}

function tileClicked(event) {
  if (!directionMap[event.target.id]) {
    return;
  }
  deactivateAll(tileInstances);
  tileInstances[event.target.id].setActive(true);
  //Send planned move to server
  if (directionMap[event.target.id]) {
    api.setPlayerDirection(directionMap[event.target.id]);
  }
}

function cardClicked(event) {
  //Handle food, combat and uninteractive
  //First, we get the type of the card
  //Then we branch off of it
  //Food/Wood => Consume
  //Weapon => Play
  //Research => Deactivate the card again
  const card = cardInstances[event.target.id];
  const type = card.getType();
  switch (type) {
    case "Food":
    case "Wood":
      api.setPlayerConsume(type);
      card.toggle();
      return;
    case "Weapon":
      if (card.isActive) {
        card.toggle();
        api.setPlayerPlay("Dice");
      } else {
        card.toggle();
        api.setPlayerPlay(type);
      }
      return;
    case "Research":
      if (card.isActive) {
        card.toggle();
      }
  }
}

startGameButton.addEventListener("click", startGame);

directions.forEach((direction) =>
  document
    .getElementById(direction)
    .addEventListener("click", (event) => tileClicked(event)),
);

allCards.forEach((card) =>
  card.addEventListener("click", (event) => cardClicked(event)),
);

document.addEventListener("DOMContentLoaded", () => {
  allTiles.forEach((tileDiv) => {
    const tile = new Tile(tileDiv, tileImages);
    tileInstances[tileDiv.id] = tile;
  });
  allCards.forEach((cardDiv) => {
    const card = new Card(cardDiv, cardImages);
    cardInstances[cardDiv.id] = card;
  });
});

async function updatePlayer() {
  var newState = await api.getPlayer();
  for (const key in newState) {
    playerState[key] = newState[key];
  }
  updateFromPlayerState();
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
