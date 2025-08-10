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
        
        // Enhanced connection tracking
        this._connectionHealth = {
            consecutiveFailures: 0,
            lastSuccessTime: null,
            isHealthy: true
        };
        
        // Request queue for retry management
        this._requestQueue = new Map();
        this._requestId = 0;
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
        const requestId = ++this._requestId;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const startTime = Date.now();
            
            const response = await fetch(url, {
                method,
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            const responseTime = Date.now() - startTime;
            
            if (!response.ok) {
                this._updateConnectionHealth(false);
                const errorText = await response.text();
                throw new GommoError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    errorText
                );
            }

            // Update connection health on success
            this._updateConnectionHealth(true);
            
            const contentType = response.headers.get('content-type');
            let result;
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                result = await response.text();
            }
            
            // Log performance for monitoring
            if (responseTime > 1000) {
                console.warn(`Slow request detected: ${method} ${path} took ${responseTime}ms`);
            }
            
            return result;
            
        } catch (error) {
            clearTimeout(timeoutId);
            this._updateConnectionHealth(false);
            
            if (error.name === 'AbortError') {
                throw new GommoError('Request timeout', 408, 'Request timed out');
            }
            
            // Enhanced error context
            if (error instanceof GommoError) {
                throw error;
            } else {
                throw new GommoError(
                    `Network error: ${error.message}`,
                    0,
                    { originalError: error.name, requestId }
                );
            }
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
            gameState: await this.getGameState(),
            events: {
                getRecent: (turns = 5) => this.getPlayerEvents(playerId, { turns }),
                getByType: (eventType, turns = 5) => this.getPlayerEventsByType(playerId, eventType, { turns }),
                getCombat: (turns = 5) => this.getPlayerCombatEvents(playerId, turns),
                getMovement: (turns = 5) => this.getPlayerMovementEvents(playerId, turns),
                getCardUsage: (turns = 5) => this.getPlayerCardEvents(playerId, turns),
                subscribe: (options) => this.subscribeToPlayerEvents(playerId, options)
            }
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
     * Get recent events for a player
     * @param {string} playerId - Player ID
     * @param {Object} options - Optional parameters
     * @param {number} options.turns - Number of recent turns to get events for (default: 5)
     * @returns {Promise<Object>} Events data with events array and count
     */
    async getPlayerEvents(playerId, options = {}) {
        const params = new URLSearchParams();
        if (options.turns !== undefined) {
            params.append('turns', options.turns.toString());
        }
        
        const queryString = params.toString();
        const path = `/player/${playerId}/events${queryString ? '?' + queryString : ''}`;
        
        try {
            const result = await this._request('GET', path);
            
            // Emit event for real-time updates
            this._emitEvent('eventsReceived', {
                playerId,
                events: result.data.events,
                count: result.data.count
            });
            
            return result.data;
        } catch (error) {
            this._handleError('getPlayerEvents', error);
            throw error;
        }
    }

    /**
     * Get filtered events by type for a player
     * @param {string} playerId - Player ID
     * @param {string} eventType - Event type to filter by
     * @param {Object} options - Optional parameters
     * @param {number} options.turns - Number of recent turns to get events for (default: 5)
     * @returns {Promise<Object>} Filtered events data
     */
    async getPlayerEventsByType(playerId, eventType, options = {}) {
        const params = new URLSearchParams();
        if (options.turns !== undefined) {
            params.append('turns', options.turns.toString());
        }
        
        const queryString = params.toString();
        const path = `/player/${playerId}/events/type/${eventType}${queryString ? '?' + queryString : ''}`;
        
        try {
            const result = await this._request('GET', path);
            
            // Emit event for real-time updates
            this._emitEvent('filteredEventsReceived', {
                playerId,
                eventType,
                events: result.data.events,
                count: result.data.count
            });
            
            return result.data;
        } catch (error) {
            this._handleError('getPlayerEventsByType', error);
            throw error;
        }
    }

    /**
     * Get recent combat events for a player
     * @param {string} playerId - Player ID
     * @param {number} turns - Number of recent turns (default: 5)
     * @returns {Promise<Object>} Combat events data
     */
    async getPlayerCombatEvents(playerId, turns = 5) {
        return this.getPlayerEventsByType(playerId, 'combat_result', { turns });
    }

    /**
     * Get recent movement events for a player
     * @param {string} playerId - Player ID
     * @param {number} turns - Number of recent turns (default: 5)
     * @returns {Promise<Object>} Movement events data
     */
    async getPlayerMovementEvents(playerId, turns = 5) {
        return this.getPlayerEventsByType(playerId, 'player_move', { turns });
    }

    /**
     * Get recent card usage events for a player
     * @param {string} playerId - Player ID
     * @param {number} turns - Number of recent turns (default: 5)
     * @returns {Promise<Object>} Card usage events data
     */
    async getPlayerCardEvents(playerId, turns = 5) {
        return this.getPlayerEventsByType(playerId, 'card_usage', { turns });
    }

    /**
     * Subscribe to real-time events for a player
     * @param {string} playerId - Player ID
     * @param {Object} options - Subscription options
     * @param {number} options.interval - Polling interval in milliseconds (default: 2000)
     * @param {number} options.turns - Number of recent turns to monitor (default: 1)
     * @param {Function} options.onNewEvents - Callback for new events
     * @returns {Function} Unsubscribe function
     */
    subscribeToPlayerEvents(playerId, options = {}) {
        const interval = options.interval || 2000;
        const turns = options.turns || 1;
        const onNewEvents = options.onNewEvents || (() => {});
        
        let lastEventCount = 0;
        let isActive = true;
        
        const pollEvents = async () => {
            if (!isActive) return;
            
            try {
                const eventsData = await this.getPlayerEvents(playerId, { turns });
                
                // Check if there are new events
                if (eventsData.count > lastEventCount) {
                    const newEvents = eventsData.events.slice(lastEventCount);
                    lastEventCount = eventsData.count;
                    
                    onNewEvents(newEvents);
                    this._emitEvent('newPlayerEvents', {
                        playerId,
                        newEvents,
                        totalCount: eventsData.count
                    });
                }
            } catch (error) {
                console.warn('Error polling player events:', error);
            }
            
            if (isActive) {
                setTimeout(pollEvents, interval);
            }
        };
        
        // Start polling
        pollEvents();
        
        // Return unsubscribe function
        return () => {
            isActive = false;
        };
    }

    /**
     * Add event listener for game events
     * @param {string} event - Event type ('stateChange', 'playerDeath', 'gameWon', 'error', 'eventsReceived', 'filteredEventsReceived', 'newPlayerEvents')
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
        this._requestQueue.clear();
        
        // Reset connection health
        this._connectionHealth = {
            consecutiveFailures: 0,
            lastSuccessTime: null,
            isHealthy: true
        };
        
        console.log('GommoClient disposed successfully');
    }

    // ===== PRIVATE HELPER METHODS =====

    async _triggerStateUpdate(playerId) {
        try {
            // Validate player ID
            if (!playerId) {
                throw new GommoError('Player ID is required for state update', 400);
            }
            
            const currentState = await this.getUIPlayerState(playerId);
            
            // Validate response
            if (!currentState || typeof currentState !== 'object') {
                throw new GommoError('Invalid state data received from server', 500);
            }
            
            // Check for significant changes for special event handling
            const hasSignificantChanges = !this._lastPlayerState || 
                this._lastPlayerState.player.position.x !== currentState.player.position.x ||
                this._lastPlayerState.player.position.y !== currentState.player.position.y ||
                this._lastPlayerState.player.alive !== currentState.player.alive ||
                this._lastPlayerState.gameState.remainingTurns !== currentState.gameState.remainingTurns;
            
            // Always emit state change to ensure UI stays fresh
            // This prevents stale tile data and ensures all changes are captured
            this._emitEvent('stateChange', currentState);
            
            // Handle special events only when there are significant changes
            if (hasSignificantChanges) {
                if (this._lastPlayerState && this._lastPlayerState.player.alive && !currentState.player.alive) {
                    this._emitEvent('playerDeath', currentState);
                }
                
                if (currentState.gameState.havePlayersWon) {
                    this._emitEvent('gameWon', currentState);
                }
            }
            
            // Always update cached state and call state change callback
            this._lastPlayerState = currentState;
            
            // Always call global state change callback to ensure UI updates
            if (this.onStateChange) {
                this.onStateChange(currentState);
            }
            
        } catch (error) {
            console.error('State update failed:', error.message);
            this._emitEvent('error', error);
            
            // Don't re-throw if it's a connection issue - let polling continue
            if (error.statusCode !== 0 && error.statusCode !== 408) {
                throw error;
            }
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

    _updateConnectionHealth(success) {
        if (success) {
            this._connectionHealth.consecutiveFailures = 0;
            this._connectionHealth.lastSuccessTime = Date.now();
            this._connectionHealth.isHealthy = true;
        } else {
            this._connectionHealth.consecutiveFailures++;
            this._connectionHealth.isHealthy = this._connectionHealth.consecutiveFailures < 3;
        }
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
    },
    
    EVENT_TYPES: {
        PLAYER_JOIN: 'player_join',
        PLAYER_MOVE: 'player_move',
        CARD_USAGE: 'card_usage',
        PLAYER_DEATH: 'player_death',
        COMBAT_RESULT: 'combat_result',
        RESOURCE_GAINED: 'resource_gained',
        GAME_TICK: 'game_tick',
        CARD_PLAYED: 'card_played',
        CARD_USED: 'card_used',
        CARD_SELECTED: 'card_selected',
        CARD_CONSUMED: 'card_consumed',
        DICE_ROLL: 'dice_roll',
        COMBAT_START: 'combat_start',
        ZOMBIE_SPAWN: 'zombie_spawn',
        CARD_DRAWN: 'card_drawn',
        CARD_DISCARDED: 'card_discarded'
    },
    
    CLIENT_EVENTS: {
        STATE_CHANGE: 'stateChange',
        PLAYER_DEATH: 'playerDeath',
        GAME_WON: 'gameWon',
        ERROR: 'error',
        EVENTS_RECEIVED: 'eventsReceived',
        FILTERED_EVENTS_RECEIVED: 'filteredEventsReceived',
        NEW_PLAYER_EVENTS: 'newPlayerEvents'
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
