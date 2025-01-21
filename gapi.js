export class GameAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  // Player Endpoints
  async addPlayer(name) {
    const response = await fetch(
      `${this.baseURL}/player/${encodeURIComponent(name)}`,
      {
        method: "POST",
      },
    );
    return response.json();
  }

  async getPlayer(playerToken) {
    const response = await fetch(
      `${this.baseURL}/player/${encodeURIComponent(playerToken)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch player: ${response.statusText}`);
    }
    return response.json();
  }

  async getPlayerSurroundings(playerToken) {
    const response = await fetch(
      `${this.baseURL}/player/${encodeURIComponent(playerToken)}/surroundings`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch surroundings: ${response.statusText}`);
    }
    return response.json();
  }

  async setPlayerDirection(playerToken, direction) {
    const response = await fetch(
      `${this.baseURL}/player/${encodeURIComponent(playerToken)}/direction/${encodeURIComponent(direction)}`,
      {
        method: "PUT",
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to set player direction: ${response.statusText}`);
    }
    return response.status === 200;
  }

  async setPlayerConsume(playerToken, card) {
    const response = await fetch(
      `${this.baseURL}/player/${encodeURIComponent(playerToken)}/consume/${encodeURIComponent(card)}`,
      {
        method: "PUT",
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to set player consume: ${response.statusText}`);
    }
    return response.status === 200;
  }

  async setPlayerDiscard(playerToken, card) {
    const response = await fetch(
      `${this.baseURL}/player/${encodeURIComponent(playerToken)}/discard/${encodeURIComponent(card)}`,
      {
        method: "PUT",
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to set player discard: ${response.statusText}`);
    }
    return response.status === 200;
  }

  async setPlayerPlay(playerToken, card) {
    const response = await fetch(
      `${this.baseURL}/player/${encodeURIComponent(playerToken)}/play/${encodeURIComponent(card)}`,
      {
        method: "PUT",
      },
    );
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
      throw new Error(
        `Failed to fetch all configuration: ${response.statusText}`,
      );
    }
    return response.json();
  }
}
