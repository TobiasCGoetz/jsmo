
import { Tile } from "./tile.js";
import { Card, findIdOfCardForType } from "./card.js";
import { GommoClient } from "./gommo-client.js";

// ===== CONFIGURATION =====
const CONFIG = {
  SERVER_URL: "http://localhost:8080",
  POLLING_INTERVALS: {
    PLAYER: 1000,
    SURROUNDINGS: 5000,
    CONFIG: 2000
  },
  DEFAULT_CARDS: ["None", "None", "None", "None", "None"],
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// ===== DOM ELEMENTS =====
const DOM = {
  tiles: document.querySelectorAll(".tile"),
  cards: document.querySelectorAll(".card"),
  overlay: document.getElementById("gameStartOverlay"),
  startButton: document.getElementById("startGameButton"),
  nameInput: document.getElementById("nameInput"),
  label: document.getElementById("label")
};

// ===== GAME STATE =====
let gameClient = null;
let currentPlayerId = null;
const instances = {
  tiles: {},
  cards: {}
};

// ===== CONSTANTS =====
const DIRECTIONS = ["NW", "NN", "NE", "WW", "CE", "EE", "SW", "SS", "SE"];

const ASSETS = {
  TILES: {
    Forest: "img/forest.jpg",
    Farm: "img/farm.jpg",
    City: "img/city.jpg",
    Laboratory: "img/laboratory.jpg",
    EDGE: "img/edge.jpg"
  },
  CARDS: {
    Food: "img/food.jpg",
    Wood: "img/wood.jpg",
    Weapon: "img/gun.jpg",
    Research: "img/dna.jpg",
    None: "img/none.jpg"
  }
};

const DIRECTION_MAP = {
  // UI to API mapping
  NN: "north",
  WW: "west",
  EE: "east",
  SS: "south",
  CE: "stay",
  // API to UI mapping
  north: "NN",
  west: "WW",
  east: "EE",
  south: "SS",
  stay: "CE"
};

const CARD_TYPES = {
  CONSUMABLE: ["Food", "Wood"],
  PLAYABLE: ["Weapon"],
  INTERACTIVE: ["Research"]
};

// ===== STATE MANAGEMENT =====
const state = {
  player: {
    name: null,
    position: { x: 0, y: 0 },
    direction: "Stay",
    actions: {
      play: "None",
      consume: "None",
      discard: "None"
    },
    cards: [...CONFIG.DEFAULT_CARDS],
    alive: false,
    isBot: false
  },
  game: {
    turnLength: 15,
    turnTime: 15,
    hasWon: false
  },
  ui: {
    initialized: false,
    connected: false
  }
};

/**
 * Safely updates the UI based on current player state
 * Includes proper error handling and validation
 */
function updateUIFromPlayerState() {
  try {
    // Update card displays
    updateCardDisplays();
    
    // Update tile states
    updateTileStates();
    
    // Update action indicators
    updateActionIndicators();
    
    // Update status label
    updateStatusLabel();
    
  } catch (error) {
    console.error('Failed to update UI from player state:', error);
    showUserMessage('UI update failed', 'error');
  }
}

/**
 * Updates card displays with proper validation
 */
function updateCardDisplays() {
  const cards = state.player.cards;
  if (!Array.isArray(cards)) {
    console.warn('Invalid cards array:', cards);
    return;
  }
  
  Object.keys(instances.cards).forEach((cardId, index) => {
    if (index < cards.length && instances.cards[cardId]) {
      instances.cards[cardId].updateType(cards[index]);
    }
  });
}

/**
 * Updates tile states with proper validation
 */
function updateTileStates() {
  // Deactivate all tiles first
  deactivateAllInstances(instances.tiles);
  
  // Activate current direction tile
  const direction = state.player.direction.toLowerCase();
  const tileId = DIRECTION_MAP[direction];
  
  if (tileId && instances.tiles[tileId]) {
    instances.tiles[tileId].setActive(true);
  }
}

/**
 * Updates action indicators (consume/play cards)
 */
function updateActionIndicators() {
  // Deactivate all cards first
  deactivateAllInstances(instances.cards);
  
  // Activate consume card if any
  const consumeCard = state.player.actions.consume;
  if (consumeCard && consumeCard !== "None") {
    const consumeCardId = findCardIdByType(consumeCard);
    if (consumeCardId && instances.cards[consumeCardId]) {
      instances.cards[consumeCardId].toggle();
    }
  }
  
  // Activate play card if any
  const playCard = state.player.actions.play;
  if (playCard && playCard !== "None") {
    const playCardId = findCardIdByType(playCard);
    if (playCardId && instances.cards[playCardId]) {
      instances.cards[playCardId].toggle();
    }
  }
}

/**
 * Safely finds card ID by type with error handling
 */
function findCardIdByType(cardType) {
  try {
    return findIdOfCardForType(instances.cards, cardType);
  } catch (error) {
    console.warn(`Could not find card ID for type: ${cardType}`, error);
    return null;
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Shows or hides the game start overlay
 * @param {boolean} show - Whether to show the overlay
 */
function toggleGameOverlay(show = false) {
  if (DOM.overlay) {
    DOM.overlay.style.display = show ? "flex" : "none";
  }
}

/**
 * Displays a user message (could be extended to show toast notifications)
 * @param {string} message - The message to display
 * @param {string} type - Message type ('info', 'error', 'success')
 */
function showUserMessage(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Could be extended to show toast notifications or update a status area
}

/**
 * Updates the status label with current player information
 */
function updateStatusLabel() {
  if (!DOM.label) return;
  
  const { alive, position } = state.player;
  const status = alive ? "Alive" : "Undead";
  const location = `${position.x}|${position.y}`;
  DOM.label.textContent = `${status} on tile ${location}`;
}

/**
 * Deactivates all instances in a collection
 * @param {Object} instanceCollection - Collection of UI instances
 */
function deactivateAllInstances(instanceCollection) {
  Object.values(instanceCollection).forEach(instance => {
    if (instance && typeof instance.setActive === 'function') {
      instance.setActive(false);
    }
  });
}

/**
 * Validates player name input
 * @param {string} name - Player name to validate
 * @returns {boolean} Whether the name is valid
 */
function validatePlayerName(name) {
  return name && typeof name === 'string' && name.trim().length > 0;
}

// ===== GAME INITIALIZATION =====

/**
 * Initializes and starts the game
 * Handles client setup, server connection, and player registration
 */
async function startGame() {
  try {
    // Validate input
    const playerName = DOM.nameInput?.value?.trim();
    if (!validatePlayerName(playerName)) {
      throw new Error('Please enter a valid player name');
    }

    toggleGameOverlay(false);
    showUserMessage('Connecting to game server...', 'info');

    // Initialize GommoClient with robust configuration
    gameClient = new GommoClient(CONFIG.SERVER_URL, {
      enablePolling: true,
      pollingInterval: CONFIG.POLLING_INTERVALS.PLAYER,
      onStateChange: handleStateChange,
      onError: handleClientError
    });

    // Verify server connection
    const isOnline = await gameClient.ping();
    if (!isOnline) {
      throw new Error('Game server is not reachable. Please check if the server is running.');
    }

    // Register player
    state.player.name = playerName;
    currentPlayerId = await gameClient.addPlayer(playerName);
    
    showUserMessage(`Player "${playerName}" registered successfully`, 'success');
    
    // Initialize game state
    await initializeGameState();
    
    // Start real-time updates
    gameClient.startPolling(currentPlayerId);
    
    state.ui.connected = true;
    showUserMessage('Game started successfully!', 'success');
    
  } catch (error) {
    console.error('Failed to start game:', error);
    showUserMessage(`Failed to start game: ${error.message}`, 'error');
    
    // Show overlay again on failure
    toggleGameOverlay(true);
    
    // Clean up on failure
    if (gameClient) {
      gameClient.dispose();
      gameClient = null;
    }
  }
}

/**
 * Initializes the game state by fetching initial data
 */
async function initializeGameState() {
  const initPromises = [
    updatePlayerData(),
    updateSurroundingsData(),
    updateGameConfig()
  ];
  
  await Promise.allSettled(initPromises);
}

/**
 * Handles state changes from the GommoClient
 * @param {Object} newState - Updated state from the client
 */
function handleStateChange(newState) {
  try {
    if (newState.player) {
      updatePlayerState(newState.player);
      updateUIFromPlayerState();
    }
    
    if (newState.gameState) {
      updateGameState(newState.gameState);
    }
  } catch (error) {
    console.error('Error handling state change:', error);
  }
}

/**
 * Handles client errors
 * @param {Error} error - Error from the GommoClient
 */
function handleClientError(error) {
  console.error('GommoClient error:', error.message);
  showUserMessage(`Connection error: ${error.message}`, 'error');
  
  // Update connection status
  state.ui.connected = false;
}

/**
 * Updates the player state from server data
 * @param {Object} playerData - Player data from server
 */
function updatePlayerState(playerData) {
  Object.assign(state.player, {
    name: playerData.name || playerData.Name,
    position: {
      x: playerData.position?.x || playerData.CurrentTile?.XPos || 0,
      y: playerData.position?.y || playerData.CurrentTile?.YPos || 0
    },
    direction: playerData.direction || playerData.Direction || "Stay",
    cards: playerData.cards?.hand || playerData.cards || playerData.Cards || CONFIG.DEFAULT_CARDS,
    alive: playerData.alive ?? playerData.Alive ?? false,
    isBot: playerData.isBot ?? playerData.IsBot ?? false
  });
}

/**
 * Updates the game state from server data
 * @param {Object} gameData - Game data from server
 */
function updateGameState(gameData) {
  Object.assign(state.game, {
    turnLength: gameData.turnLength || gameData.TurnLength || 15,
    turnTime: gameData.turnTimer || gameData.TurnTime || 15,
    hasWon: gameData.havePlayersWon ?? gameData.HaveWon ?? false
  });
}



// ===== EVENT HANDLERS =====

/**
 * Handles tile click events for movement
 * @param {Event} event - Click event
 */
async function handleTileClick(event) {
  const tileId = event.target.id;
  const direction = DIRECTION_MAP[tileId];
  
  if (!direction || !gameClient || !currentPlayerId) {
    console.warn('Invalid tile click or game not ready:', { tileId, direction, hasClient: !!gameClient, hasPlayerId: !!currentPlayerId });
    return;
  }
  
  if (!state.ui.connected) {
    showUserMessage('Not connected to server', 'error');
    return;
  }
  
  try {
    // Update UI immediately for responsiveness
    deactivateAllInstances(instances.tiles);
    if (instances.tiles[tileId]) {
      instances.tiles[tileId].setActive(true);
    }
    
    // Send direction to server
    await gameClient.setPlayerDirection(currentPlayerId, direction);
    
    // Update local state
    state.player.direction = direction;
    
    showUserMessage(`Moving ${direction}`, 'info');
    
  } catch (error) {
    console.error('Failed to set player direction:', error);
    showUserMessage(`Failed to move ${direction}: ${error.message}`, 'error');
    
    // Revert UI on error
    updateTileStates();
  }
}

/**
 * Handles card click events for actions
 * @param {Event} event - Click event
 */
async function handleCardClick(event) {
  const cardId = event.target.id;
  const card = instances.cards[cardId];
  
  if (!card || !gameClient || !currentPlayerId) {
    console.warn('Invalid card click or game not ready:', { cardId, hasCard: !!card, hasClient: !!gameClient, hasPlayerId: !!currentPlayerId });
    return;
  }
  
  if (!state.ui.connected) {
    showUserMessage('Not connected to server', 'error');
    return;
  }
  
  try {
    const cardType = card.getType();
    
    if (CARD_TYPES.CONSUMABLE.includes(cardType)) {
      await handleConsumableCard(card, cardType);
    } else if (CARD_TYPES.PLAYABLE.includes(cardType)) {
      await handlePlayableCard(card, cardType);
    } else if (CARD_TYPES.INTERACTIVE.includes(cardType)) {
      await handleInteractiveCard(card, cardType);
    } else {
      console.warn('Unknown card type:', cardType);
    }
    
  } catch (error) {
    console.error('Failed to handle card action:', error);
    showUserMessage(`Card action failed: ${error.message}`, 'error');
  }
}

/**
 * Handles consumable cards (Food, Wood)
 * @param {Object} card - Card instance
 * @param {string} cardType - Type of card
 */
async function handleConsumableCard(card, cardType) {
  await gameClient.consumeCard(currentPlayerId, cardType.toLowerCase());
  card.toggle();
  state.player.actions.consume = cardType;
  showUserMessage(`Consumed ${cardType}`, 'info');
}

/**
 * Handles playable cards (Weapon)
 * @param {Object} card - Card instance
 * @param {string} cardType - Type of card
 */
async function handlePlayableCard(card, cardType) {
  if (card.isActive) {
    // Deactivate weapon (play dice instead)
    card.toggle();
    await gameClient.playCard(currentPlayerId, "dice");
    state.player.actions.play = "Dice";
    showUserMessage('Played dice', 'info');
  } else {
    // Activate weapon
    card.toggle();
    await gameClient.playCard(currentPlayerId, cardType.toLowerCase());
    state.player.actions.play = cardType;
    showUserMessage(`Played ${cardType}`, 'info');
  }
}

/**
 * Handles interactive cards (Research)
 * @param {Object} card - Card instance
 * @param {string} cardType - Type of card
 */
async function handleInteractiveCard(card, cardType) {
  if (card.isActive) {
    card.toggle();
    showUserMessage(`Deactivated ${cardType}`, 'info');
  } else {
    showUserMessage(`${cardType} cards are for information only`, 'info');
  }
}

// ===== EVENT LISTENERS SETUP =====

/**
 * Sets up all event listeners for the game
 */
function setupEventListeners() {
  // Start game button
  if (DOM.startButton) {
    DOM.startButton.addEventListener("click", startGame);
  }

  // Tile click handlers
  DIRECTIONS.forEach((direction) => {
    const element = document.getElementById(direction);
    if (element) {
      element.addEventListener("click", handleTileClick);
    }
  });

  // Card click handlers
  DOM.cards.forEach((card) => {
    card.addEventListener("click", handleCardClick);
  });
  
  // Keyboard shortcuts (optional enhancement)
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handles keyboard shortcuts for game actions
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardShortcuts(event) {
  if (!state.ui.connected || !currentPlayerId) return;
  
  // Example shortcuts - could be expanded
  switch (event.key.toLowerCase()) {
    case 'w':
      event.preventDefault();
      simulateClick('NN'); // North
      break;
    case 's':
      event.preventDefault();
      simulateClick('SS'); // South
      break;
    case 'a':
      event.preventDefault();
      simulateClick('WW'); // West
      break;
    case 'd':
      event.preventDefault();
      simulateClick('EE'); // East
      break;
  }
}

/**
 * Simulates a click on an element
 * @param {string} elementId - ID of element to click
 */
function simulateClick(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.click();
  }
}



// ===== INITIALIZATION =====

/**
 * Initializes the application when DOM is loaded
 */
function initializeApplication() {
  try {
    // Initialize tile instances
    DOM.tiles.forEach((tileDiv) => {
      if (tileDiv.id) {
        const tile = new Tile(tileDiv, ASSETS.TILES);
        instances.tiles[tileDiv.id] = tile;
      }
    });

    // Initialize card instances
    DOM.cards.forEach((cardDiv) => {
      if (cardDiv.id) {
        const card = new Card(cardDiv, ASSETS.CARDS);
        instances.cards[cardDiv.id] = card;
      }
    });

    // Set up event listeners
    setupEventListeners();
    
    // Mark as initialized
    state.ui.initialized = true;
    
    console.log('Application initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    showUserMessage('Application initialization failed', 'error');
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializeApplication);

// ===== DATA UPDATE FUNCTIONS =====

/**
 * Updates player data from the server
 * @param {number} retryCount - Current retry attempt
 */
async function updatePlayerData(retryCount = 0) {
  if (!gameClient || !currentPlayerId) {
    return;
  }
  
  try {
    const playerData = await gameClient.getPlayer(currentPlayerId);
    updatePlayerState(playerData);
    updateUIFromPlayerState();
    
  } catch (error) {
    console.error('Failed to update player data:', error.message);
    
    // Retry logic
    if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
      console.log(`Retrying player update (${retryCount + 1}/${CONFIG.MAX_RETRY_ATTEMPTS})...`);
      setTimeout(() => updatePlayerData(retryCount + 1), CONFIG.RETRY_DELAY);
    } else {
      showUserMessage('Failed to update player data', 'error');
    }
  }
}

/**
 * Updates game configuration from the server
 * @param {number} retryCount - Current retry attempt
 */
async function updateGameConfig(retryCount = 0) {
  if (!gameClient) {
    return;
  }
  
  try {
    const gameData = await gameClient.getGameState();
    updateGameState(gameData);
    
    // Log game state changes
    if (state.game.hasWon) {
      showUserMessage('Game has been won!', 'success');
    }
    
  } catch (error) {
    console.error('Failed to update game config:', error.message);
    
    // Retry logic
    if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
      console.log(`Retrying config update (${retryCount + 1}/${CONFIG.MAX_RETRY_ATTEMPTS})...`);
      setTimeout(() => updateGameConfig(retryCount + 1), CONFIG.RETRY_DELAY);
    } else {
      showUserMessage('Failed to update game configuration', 'error');
    }
  }
}

/**
 * Updates surroundings data from the server
 * @param {number} retryCount - Current retry attempt
 */
async function updateSurroundingsData(retryCount = 0) {
  if (!gameClient || !currentPlayerId) {
    return;
  }
  
  try {
    const surroundings = await gameClient.getPlayerSurroundings(currentPlayerId);
    
    // Update each tile with new data
    Object.entries(surroundings).forEach(([tileId, tileData]) => {
      updateTileDisplay(tileId, tileData);
    });
    
  } catch (error) {
    console.error('Failed to update surroundings:', error.message);
    
    // Retry logic
    if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
      console.log(`Retrying surroundings update (${retryCount + 1}/${CONFIG.MAX_RETRY_ATTEMPTS})...`);
      setTimeout(() => updateSurroundingsData(retryCount + 1), CONFIG.RETRY_DELAY);
    } else {
      showUserMessage('Failed to update surroundings', 'error');
    }
  }
}

/**
 * Updates a specific tile display with new content
 * @param {string} tileId - ID of the tile to update
 * @param {Object} tileData - New tile data
 */
function updateTileDisplay(tileId, tileData) {
  try {
    const tileInstance = instances.tiles[tileId];
    if (tileInstance && typeof tileInstance.updateByContent === 'function') {
      tileInstance.updateByContent(tileData);
    } else {
      console.warn(`Tile instance not found or invalid: ${tileId}`);
    }
  } catch (error) {
    console.error(`Failed to update tile ${tileId}:`, error);
  }
}

// ===== CLEANUP AND DISPOSAL =====

/**
 * Cleans up resources when the game ends or page unloads
 */
function cleanup() {
  try {
    if (gameClient) {
      gameClient.dispose();
      gameClient = null;
    }
    
    currentPlayerId = null;
    state.ui.connected = false;
    
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanup);

// ===== DEBUGGING AND DEVELOPMENT HELPERS =====

/**
 * Development helper to inspect current state
 * Available in browser console as window.debugGameState()
 */
function debugGameState() {
  console.group('🎮 Game State Debug Info');
  console.log('Player State:', state.player);
  console.log('Game State:', state.game);
  console.log('UI State:', state.ui);
  console.log('Client Connected:', !!gameClient);
  console.log('Player ID:', currentPlayerId);
  console.log('Tile Instances:', Object.keys(instances.tiles));
  console.log('Card Instances:', Object.keys(instances.cards));
  console.groupEnd();
  return state;
}

// Make debug function available globally in development
if (typeof window !== 'undefined') {
  window.debugGameState = debugGameState;
}

// ===== EXPORT FOR TESTING (if needed) =====
// Uncomment for unit testing
/*
export {
  state,
  CONFIG,
  updatePlayerState,
  updateGameState,
  validatePlayerName,
  handleTileClick,
  handleCardClick
};
*/
