/**
 * Gommo Web Client - JavaScript library for building web UIs for the Gommo zombie survival game
 * 
 * This client provides a frontend-focused interface to interact with the Gommo game server API.
 * Designed specifically for web applications, it includes UI helpers, state management,
 * and reactive features for building interactive game interfaces.
 */

class GommoClient {
    /**
     * Create a new Gommo Web Client
     * @param {string} baseUrl - The base URL of the Gommo server (e.g., 'http://localhost:8080')
     * @param {Object} options - Optional configuration
     * @param {number} options.timeout - Request timeout in milliseconds (default: 5000)
     * @param {boolean} options.enablePolling - Enable automatic polling for real-time updates (default: false)
     * @param {number} options.pollingInterval - Polling interval in milliseconds (default: 2000)
     * @param {Function} options.onStateChange - Callback for state changes (player, game state)
     * @param {Function} options.onError - Global error handler
     */
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.timeout = options.timeout || 5000;
        this.enablePolling = options.enablePolling || false;
        this.pollingInterval = options.pollingInterval || 2000;
        this.onStateChange = options.onStateChange || null;
        this.onError = options.onError || null;
        
        // Internal state for UI helpers
        this._pollingTimer = null;
        this._lastGameState = null;
        this._lastPlayerState = null;
        this._eventListeners = new Map();
    }

    /**
     * Make an HTTP request to the server
     * @private
     * @param {string} method - HTTP method
     * @param {string} path - API endpoint path
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async _request(method, path, options = {}) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new GommoError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    errorText
                );
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new GommoError('Request timeout', 408, 'Request timed out');
            }
            throw error;
        }
    }

    /**
     * Get game configuration and state
     * @returns {Promise<GameState>} Current game state
     */
    async getGameState() {
        return await this._request('GET', '/config');
    }

    /**
     * Add a new player to the game
     * @param {string} playerName - Name of the player to add
     * @returns {Promise<string>} Player ID
     */
    async addPlayer(playerName) {
        if (!playerName || typeof playerName !== 'string') {
            throw new GommoError('Player name must be a non-empty string', 400);
        }
        return await this._request('POST', `/player/${encodeURIComponent(playerName)}`);
    }

    /**
     * Get player information by ID
     * @param {string} playerId - Player ID
     * @returns {Promise<Player>} Player data
     */
    async getPlayer(playerId) {
        if (!playerId) {
            throw new GommoError('Player ID is required', 400);
        }
        return await this._request('GET', `/player/${encodeURIComponent(playerId)}`);
    }

    /**
     * Get surroundings for a player
     * @param {string} playerId - Player ID
     * @returns {Promise<Surroundings>} Map surroundings data
     */
    async getPlayerSurroundings(playerId) {
        if (!playerId) {
            throw new GommoError('Player ID is required', 400);
        }
        return await this._request('GET', `/player/${encodeURIComponent(playerId)}/surroundings`);
    }

    /**
     * Set player direction
     * @param {string} playerId - Player ID
     * @param {string} direction - Direction ('north', 'east', 'south', 'west', 'stay')
     * @returns {Promise<void>}
     */
    async setPlayerDirection(playerId, direction) {
        if (!playerId) {
            throw new GommoError('Player ID is required', 400);
        }
        
        const validDirections = ['north', 'east', 'south', 'west', 'stay'];
        const normalizedDirection = direction.toLowerCase();
        
        if (!validDirections.includes(normalizedDirection)) {
            throw new GommoError(
                `Invalid direction. Must be one of: ${validDirections.join(', ')}`,
                400
            );
        }

        await this._request('PUT', `/player/${encodeURIComponent(playerId)}/direction/${normalizedDirection}`);
    }

    /**
     * Play a card for a player
     * @param {string} playerId - Player ID
     * @param {string} cardType - Card type ('food', 'wood', 'weapon', 'dice', 'research', 'none')
     * @returns {Promise<void>}
     */
    async playCard(playerId, cardType) {
        if (!playerId) {
            throw new GommoError('Player ID is required', 400);
        }

        const validCards = ['food', 'wood', 'weapon', 'dice', 'research', 'none'];
        const normalizedCardType = cardType.toLowerCase();
        
        if (!validCards.includes(normalizedCardType)) {
            throw new GommoError(
                `Invalid card type. Must be one of: ${validCards.join(', ')}`,
                400
            );
        }

        await this._request('PUT', `/player/${encodeURIComponent(playerId)}/play/${normalizedCardType}`);
    }

    /**
     * Move a player and automatically update UI state
     * @param {string} playerId - Player ID
     * @param {string} direction - Direction to move
     * @param {boolean} updateState - Whether to trigger state update callbacks (default: true)
     * @returns {Promise<void>}
     */
    async movePlayer(playerId, direction, updateState = true) {
        await this.setPlayerDirection(playerId, direction);
        if (updateState) {
            await this._triggerStateUpdate(playerId);
        }
    }

    /**
     * Consume a card and automatically update UI state
     * @param {string} playerId - Player ID
     * @param {string} cardType - Card type to consume
     * @param {boolean} updateState - Whether to trigger state update callbacks (default: true)
     * @returns {Promise<void>}
     */
    async consumeCard(playerId, cardType, updateState = true) {
        await this.playCard(playerId, cardType);
        if (updateState) {
            await this._triggerStateUpdate(playerId);
        }
    }

    /**
     * Get complete player state including surroundings
     * @param {string} playerId - Player ID
     * @returns {Promise<{player: Player, surroundings: Surroundings}>}
     */
    async getPlayerState(playerId) {
        const [player, surroundings] = await Promise.all([
            this.getPlayer(playerId),
            this.getPlayerSurroundings(playerId)
        ]);
        
        return { player, surroundings };
    }

    /**
     * Check if the server is reachable
     * @returns {Promise<boolean>} True if server is reachable
     */
    async ping() {
        try {
            await this.getGameState();
            return true;
        } catch (error) {
            return false;
        }
    }

    // ===== UI-FOCUSED METHODS =====

    /**
     * Start automatic polling for real-time updates
     * @param {string} playerId - Player ID to monitor
     * @param {number} interval - Polling interval in milliseconds (optional)
     */
    startPolling(playerId, interval = null) {
        if (this._pollingTimer) {
            this.stopPolling();
        }
        
        const pollInterval = interval || this.pollingInterval;
        this._pollingTimer = setInterval(async () => {
            try {
                await this._triggerStateUpdate(playerId);
            } catch (error) {
                if (this.onError) {
                    this.onError(error);
                }
            }
        }, pollInterval);
    }

    /**
     * Stop automatic polling
     */
    stopPolling() {
        if (this._pollingTimer) {
            clearInterval(this._pollingTimer);
            this._pollingTimer = null;
        }
    }

    /**
     * Get formatted player state for UI display
     * @param {string} playerId - Player ID
     * @returns {Promise<Object>} Formatted state object for UI
     */
    async getUIPlayerState(playerId) {
        const { player, surroundings } = await this.getPlayerState(playerId);
        
        return {
            player: {
                id: player.ID,
                name: player.Name,
                alive: player.Alive,
                position: {
                    x: player.CurrentTile.XPos,
                    y: player.CurrentTile.YPos,
                    terrain: player.CurrentTile.Terrain
                },
                direction: player.Direction,
                cards: {
                    hand: player.Cards.filter(card => card !== 'None'),
                    handSize: player.Cards.filter(card => card !== 'None').length,
                    maxSize: 5,
                    play: player.Play,
                    consume: player.Consume,
                    discard: player.Discard
                },
                research: {
                    positions: player.ResearchAcquisitionPos,
                    count: player.Cards.filter(card => card === 'Research').length
                }
            },
            surroundings: this._formatSurroundings(surroundings),
            gameState: await this.getGameState()
        };
    }

    /**
     * Get available actions for a player based on current state
     * @param {string} playerId - Player ID
     * @returns {Promise<Object>} Available actions
     */
    async getAvailableActions(playerId) {
        const { player, surroundings } = await this.getPlayerState(playerId);
        
        if (!player.Alive) {
            return { canMove: false, canPlay: false, availableCards: [], availableDirections: [] };
        }

        const availableCards = player.Cards.filter(card => card !== 'None');
        const availableDirections = [];
        
        // Check which directions are safe/available
        const directions = [
            { name: 'north', tile: surroundings.NN, constant: GommoConstants.DIRECTIONS.NORTH },
            { name: 'east', tile: surroundings.EE, constant: GommoConstants.DIRECTIONS.EAST },
            { name: 'south', tile: surroundings.SS, constant: GommoConstants.DIRECTIONS.SOUTH },
            { name: 'west', tile: surroundings.WW, constant: GommoConstants.DIRECTIONS.WEST },
            { name: 'stay', tile: surroundings.CE, constant: GommoConstants.DIRECTIONS.STAY }
        ];

        directions.forEach(dir => {
            if (dir.tile.TileType !== 'Edge') {
                availableDirections.push({
                    direction: dir.constant,
                    name: dir.name,
                    safe: dir.tile.ZombieCount === 0,
                    zombieCount: dir.tile.ZombieCount,
                    terrain: dir.tile.TileType,
                    playerCount: dir.tile.PlayerCount
                });
            }
        });

        return {
            canMove: true,
            canPlay: availableCards.length > 0,
            availableCards: availableCards.map(card => ({
                type: card,
                constant: GommoConstants.CARDS[card.toUpperCase()]
            })),
            availableDirections,
            recommendations: this._getActionRecommendations(player, surroundings)
        };
    }

    /**
     * Execute a complete turn (move + consume) with UI updates
     * @param {string} playerId - Player ID
     * @param {string} direction - Direction to move
     * @param {string} cardType - Card to consume
     * @returns {Promise<Object>} Turn result
     */
    async executeTurn(playerId, direction, cardType) {
        try {
            const beforeState = await this.getUIPlayerState(playerId);
            
            // Execute actions
            await this.movePlayer(playerId, direction, false);
            await this.consumeCard(playerId, cardType, false);
            
            // Get updated state
            const afterState = await this.getUIPlayerState(playerId);
            
            // Trigger state change callback
            if (this.onStateChange) {
                this.onStateChange({
                    type: 'turn_complete',
                    before: beforeState,
                    after: afterState,
                    actions: { direction, cardType }
                });
            }
            
            return {
                success: true,
                before: beforeState,
                after: afterState,
                actions: { direction, cardType }
            };
            
        } catch (error) {
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    /**
     * Add event listener for game events
     * @param {string} event - Event type ('stateChange', 'playerDeath', 'gameWon', 'error')
     * @param {Function} callback - Event handler
     */
    addEventListener(event, callback) {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, []);
        }
        this._eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event type
     * @param {Function} callback - Event handler to remove
     */
    removeEventListener(event, callback) {
        if (this._eventListeners.has(event)) {
            const listeners = this._eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Clean up resources (stop polling, clear listeners)
     */
    dispose() {
        this.stopPolling();
        this._eventListeners.clear();
    }

    // ===== PRIVATE HELPER METHODS =====

    async _triggerStateUpdate(playerId) {
        try {
            const currentState = await this.getUIPlayerState(playerId);
            
            // Check for significant changes
            const hasChanges = !this._lastPlayerState || 
                this._lastPlayerState.player.position.x !== currentState.player.position.x ||
                this._lastPlayerState.player.position.y !== currentState.player.position.y ||
                this._lastPlayerState.player.alive !== currentState.player.alive ||
                this._lastPlayerState.gameState.remainingTurns !== currentState.gameState.remainingTurns;
            
            if (hasChanges) {
                // Emit events
                this._emitEvent('stateChange', currentState);
                
                if (this._lastPlayerState && this._lastPlayerState.player.alive && !currentState.player.alive) {
                    this._emitEvent('playerDeath', currentState);
                }
                
                if (currentState.gameState.havePlayersWon) {
                    this._emitEvent('gameWon', currentState);
                }
                
                // Update cached state
                this._lastPlayerState = currentState;
                
                // Call global state change callback
                if (this.onStateChange) {
                    this.onStateChange(currentState);
                }
            }
            
        } catch (error) {
            this._emitEvent('error', error);
            throw error;
        }
    }

    _formatSurroundings(surroundings) {
        const formatTile = (tile) => ({
            terrain: tile.TileType,
            zombies: tile.ZombieCount,
            players: tile.PlayerCount,
            plannedMoves: {
                north: tile.PlayersPlanMoveNorth,
                east: tile.PlayersPlanMoveEast,
                south: tile.PlayersPlanMoveSouth,
                west: tile.PlayersPlanMoveWest
            },
            safe: tile.ZombieCount === 0,
            dangerous: tile.ZombieCount > 2
        });

        return {
            grid: [
                [formatTile(surroundings.NW), formatTile(surroundings.NN), formatTile(surroundings.NE)],
                [formatTile(surroundings.WW), formatTile(surroundings.CE), formatTile(surroundings.EE)],
                [formatTile(surroundings.SW), formatTile(surroundings.SS), formatTile(surroundings.SE)]
            ],
            center: formatTile(surroundings.CE),
            adjacent: {
                north: formatTile(surroundings.NN),
                east: formatTile(surroundings.EE),
                south: formatTile(surroundings.SS),
                west: formatTile(surroundings.WW)
            }
        };
    }

    _getActionRecommendations(player, surroundings) {
        const recommendations = [];
        
        // Movement recommendations
        const currentZombies = surroundings.CE.ZombieCount;
        const directions = [
            { name: 'north', tile: surroundings.NN },
            { name: 'east', tile: surroundings.EE },
            { name: 'south', tile: surroundings.SS },
            { name: 'west', tile: surroundings.WW }
        ];
        
        const safestDirection = directions.reduce((safest, current) => {
            if (current.tile.TileType === 'Edge') return safest;
            return current.tile.ZombieCount < safest.tile.ZombieCount ? current : safest;
        }, { tile: { ZombieCount: Infinity } });
        
        if (currentZombies > 0 && safestDirection.tile.ZombieCount < currentZombies) {
            recommendations.push({
                type: 'movement',
                action: safestDirection.name,
                reason: `Move ${safestDirection.name} to escape ${currentZombies} zombies`,
                priority: 'high'
            });
        }
        
        // Card recommendations
        const availableCards = player.Cards.filter(card => card !== 'None');
        
        if (availableCards.includes('Food')) {
            recommendations.push({
                type: 'consume',
                action: 'food',
                reason: 'Consume food for safe survival',
                priority: 'medium'
            });
        }
        
        if (availableCards.includes('Weapon') && currentZombies > 0) {
            recommendations.push({
                type: 'play',
                action: 'weapon',
                reason: `Use weapon against ${currentZombies} zombies`,
                priority: 'high'
            });
        }
        
        if (surroundings.CE.TileType === 'Laboratory') {
            const researchCount = availableCards.filter(card => card === 'Research').length;
            recommendations.push({
                type: 'info',
                action: 'stay',
                reason: `At laboratory with ${researchCount} research cards`,
                priority: researchCount >= 3 ? 'high' : 'low'
            });
        }
        
        return recommendations;
    }

    _emitEvent(eventType, data) {
        if (this._eventListeners.has(eventType)) {
            this._eventListeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventType}:`, error);
                }
            });
        }
    }
}

/**
 * Custom error class for Gommo API errors
 */
class GommoError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = 'GommoError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

/**
 * Constants for game enums
 */
const GommoConstants = {
    DIRECTIONS: {
        NORTH: 'north',
        EAST: 'east',
        SOUTH: 'south',
        WEST: 'west',
        STAY: 'stay'
    },
    
    CARDS: {
        FOOD: 'food',
        WOOD: 'wood',
        WEAPON: 'weapon',
        DICE: 'dice',
        RESEARCH: 'research',
        NONE: 'none'
    },
    
    TERRAINS: {
        FOREST: 'Forest',
        FARM: 'Farm',
        CITY: 'City',
        LABORATORY: 'Laboratory',
        EDGE: 'Edge'
    }
};

// ES6 Module Export (works in both browser and Node.js with proper setup)
export { GommoClient, GommoError, GommoConstants };

// Backward compatibility: also export to global window if available
if (typeof window !== 'undefined') {
    window.GommoClient = GommoClient;
    window.GommoError = GommoError;
    window.GommoConstants = GommoConstants;
}
