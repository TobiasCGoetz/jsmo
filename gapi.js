class GameAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  // Player Endpoints
  async addPlayer(name) {
    const response = await fetch(`${this.baseURL}/player/${encodeURIComponent(name)}`, {
      method: "POST",
    });
    return response.json();
  }

  async getPlayer(id) {
    const response = await fetch(`${this.baseURL}/player/${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch player: ${response.statusText}`);
    }
    return response.json();
  }

  async getPlayerSurroundings(id) {
    const response = await fetch(`${this.baseURL}/player/${encodeURIComponent(id)}/surroundings`);
    if (!response.ok) {
      throw new Error(`Failed to fetch surroundings: ${response.statusText}`);
    }
    return response.json();
  }

  async setPlayerDirection(id, direction) {
    const response = await fetch(`${this.baseURL}/player/${encodeURIComponent(id)}/direction/${encodeURIComponent(direction)}`, {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`Failed to set player direction: ${response.statusText}`);
    }
    return response.status === 200;
  }

  async setPlayerConsume(id, card) {
    const response = await fetch(`${this.baseURL}/player/${encodeURIComponent(id)}/consume/${encodeURIComponent(card)}`, {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`Failed to set player consume: ${response.statusText}`);
    }
    return response.status === 200;
  }

  async setPlayerDiscard(id, card) {
    const response = await fetch(`${this.baseURL}/player/${encodeURIComponent(id)}/discard/${encodeURIComponent(card)}`, {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`Failed to set player discard: ${response.statusText}`);
    }
    return response.status === 200;
  }

  async setPlayerPlay(id, card) {
    const response = await fetch(`${this.baseURL}/player/${encodeURIComponent(id)}/play/${encodeURIComponent(card)}`, {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`Failed to set player play: ${response.statusText}`);
    }
    return response.status === 200;
  }

  // Config Endpoints
  async getTurnTimer() {
    const response = await fetch(`${this.baseURL}/config/turnTimer`);
    if (!response.ok) {
      throw new Error(`Failed to fetch turn timer: ${response.statusText}`);
    }
    return response.json();
  }

  async getTurnLength() {
    const response = await fetch(`${this.baseURL}/config/turnLength`);
    if (!response.ok) {
      throw new Error(`Failed to fetch turn length: ${response.statusText}`);
    }
    return response.json();
  }

  async getMapSize() {
    const response = await fetch(`${this.baseURL}/config/mapSize`);
    if (!response.ok) {
      throw new Error(`Failed to fetch map size: ${response.statusText}`);
    }
    return response.json();
  }

  async hasGameBeenWon() {
    const response = await fetch(`${this.baseURL}/config/hasWon`);
    if (!response.ok) {
      throw new Error(`Failed to fetch game state: ${response.statusText}`);
    }
    return response.json();
  }

  async getAllConfig() {
    const response = await fetch(`${this.baseURL}/config`);
    if (!response.ok) {
      throw new Error(`Failed to fetch all configuration: ${response.statusText}`);
    }
    return response.json();
  }
}

// Example Usage
const api = new GameAPI("http://localhost:8080");

(async () => {
  try {
    // Add a player
    const playerId = await api.addPlayer("PlayerName");
    console.log("Added Player:", playerId);

    // Get player details
    const playerDetails = await api.getPlayer(playerId);
    console.log("Player Details:", playerDetails);

    // Set direction
    await api.setPlayerDirection(playerId, "north");
    console.log("Direction set successfully");

    // Get configuration
    const config = await api.getAllConfig();
    console.log("Game Config:", config);
  } catch (error) {
    console.error("API Error:", error);
  }
})();
