/**
 * Game Engine - Client-side interface to the backend server
 * 
 * Communicates with Node.js server via REST API and WebSocket
 */

// Server configuration - uses current hostname for LAN support
const SERVER_PORT = 3001;
const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE = import.meta.env.VITE_API_URL || `http://${currentHost}:${SERVER_PORT}/api`;
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${currentHost}:${SERVER_PORT}`;

// Singleton flag to prevent multiple instances
let engineInstance = null;

/**
 * Game Engine Class - connects to backend
 */
class GameEngine {
    constructor() {
        // Singleton pattern
        if (engineInstance) {
            return engineInstance;
        }
        engineInstance = this;

        this.state = {
            gameCode: null,
            hostId: null,
            players: {},
            currentRound: 1,
            phase: 'IDLE',
            paused: false,
            snippets: [],
            baselineSnippets: {},
            currentSnippetId: null,
            currentCode: {},
            bugPool: [],
            leaderboards: [],
            config: null,
            joiningDisabled: false,
            submissions: {},
            initialized: false
        };

        this.listeners = new Set();
        this.ws = null;
        this.wsConnecting = false; // Flag to prevent duplicate connections
        this.initPromise = null;   // Store init promise to prevent duplicate inits
        this.playerId = localStorage.getItem('cseg_player_id');
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimer = null;
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners
     */
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    /**
     * Get current state
     */
    getState() {
        return this.state;
    }

    /**
     * Initialize - connect to server and load state
     */
    async initialize() {
        // Already initialized
        if (this.state.initialized) {
            return { success: true };
        }

        // Already initializing - return existing promise
        if (this.initPromise) {
            return this.initPromise;
        }

        // Start initialization
        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        try {
            // Try to fetch current state from server
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${API_BASE}/game`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            if (data.success && data.state) {
                this.state = {
                    ...data.state,
                    initialized: true
                };
            } else {
                this.state.initialized = true;
            }

            // Load snippets to server if not loaded
            if (!this.state.snippets || this.state.snippets.length === 0) {
                await this.loadSnippets();
            }

            // Connect WebSocket for real-time updates
            this.connectWebSocket();

            this.notify();
            return { success: true };

        } catch (error) {
            console.error('Failed to initialize:', error);
            this.state.initialized = true;
            this.notify();
            return { success: false, error: 'Cannot connect to server. Make sure backend is running on port 3001.' };
        }
    }

    /**
     * Load snippets to server
     */
    async loadSnippets() {
        try {
            const res = await fetch('/snippets.json');
            const snippetsData = await res.json();

            await fetch(`${API_BASE}/snippets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snippetsData })
            });

            this.state.snippets = snippetsData;
            this.state.baselineSnippets = {};
            snippetsData.forEach(s => {
                this.state.baselineSnippets[s.id] = s.code;
            });
        } catch (e) {
            console.error('Failed to load snippets:', e);
        }
    }

    /**
     * Connect WebSocket for real-time updates
     */
    connectWebSocket() {
        // Already connected or connecting - do nothing
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            return;
        }
        if (this.wsConnecting) {
            return;
        }

        // Set connecting flag
        this.wsConnecting = true;

        // Clean up old connection if exists
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.onopen = null;
            try { this.ws.close(); } catch (e) { }
            this.ws = null;
        }

        // Clear any pending reconnect
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        try {
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.wsConnecting = false;
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'STATE_UPDATE' && data.state) {
                        this.state = {
                            ...data.state,
                            initialized: true
                        };
                        this.notify();
                    } else if (data.type === 'CONNECTED' && data.state) {
                        this.state = {
                            ...data.state,
                            initialized: true
                        };
                        this.notify();
                    }
                } catch (e) {
                    console.error('Failed to parse WS message:', e);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected');
                this.wsConnecting = false;
                this.ws = null;

                // Only attempt reconnect if unexpected close and not too many attempts
                if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(2000 * this.reconnectAttempts, 10000);
                    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
                    this.reconnectTimer = setTimeout(() => this.connectWebSocket(), delay);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.wsConnecting = false;
            };
        } catch (e) {
            console.error('Failed to connect WebSocket:', e);
            this.wsConnecting = false;
        }
    }

    /**
     * Make API request
     */
    async apiRequest(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        return response.json();
    }

    /**
     * Send game action to server
     */
    async sendAction(action, data = {}) {
        try {
            const result = await this.apiRequest('/game/action', 'POST', {
                action,
                playerId: this.playerId,
                data
            });
            return result;
        } catch (error) {
            console.error('Action failed:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Create a new game as host
     */
    async createGame(hostName) {
        if (!hostName || !hostName.trim()) {
            return { success: false, message: 'Name is required' };
        }

        try {
            const result = await this.apiRequest('/game', 'POST', { hostName });

            if (result.success) {
                this.playerId = result.playerId;
                localStorage.setItem('cseg_player_id', result.playerId);
                localStorage.setItem('cseg_game_code', result.gameCode);
            }

            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Join an existing game
     */
    async joinGame(playerName, gameCode) {
        if (!playerName || !playerName.trim()) {
            return { success: false, message: 'Name is required' };
        }

        try {
            const result = await this.apiRequest('/game/join', 'POST', {
                playerName,
                gameCode
            });

            if (result.success) {
                this.playerId = result.playerId;
                localStorage.setItem('cseg_player_id', result.playerId);
                localStorage.setItem('cseg_game_code', result.gameCode);
            }

            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Check if current user is the host
     */
    isHost() {
        return this.playerId === this.state.hostId;
    }

    /**
     * Get current player ID
     */
    getCurrentPlayerId() {
        return this.playerId;
    }

    /**
     * Check if there's an active game
     */
    hasActiveGame() {
        return Boolean(this.state.gameCode && this.state.phase !== 'IDLE');
    }

    /**
     * Check if current user is in the game
     */
    isInGame() {
        return this.playerId && this.state.players[this.playerId];
    }

    /**
     * Start RED round (host only)
     */
    async startRedRound() {
        return this.sendAction('START_RED');
    }

    /**
     * Start BLUE round (host only)
     */
    async startBlueRound() {
        return this.sendAction('START_BLUE');
    }

    /**
     * Update player's current code
     */
    async updateCode(playerId, newCode) {
        this.state.currentCode[playerId] = newCode;
        return this.sendAction('UPDATE_CODE', { code: newCode });
    }

    /**
     * Submit RED round changes
     */
    async submitRedRound(playerId) {
        return this.sendAction('SUBMIT_RED');
    }

    /**
     * Submit BLUE round fixes
     */
    async submitBlueRound(playerId) {
        return this.sendAction('SUBMIT_BLUE');
    }

    /**
     * End current round pair and generate leaderboard
     */
    async endRoundPair() {
        return this.sendAction('END_ROUND');
    }

    /**
     * Start next round pair
     */
    async startNextRound() {
        const result = await this.sendAction('NEXT_ROUND');
        if (result.success && !result.ended) {
            return this.startRedRound();
        }
        return result;
    }

    /**
     * Toggle pause
     */
    async pauseGame() {
        return this.sendAction('PAUSE');
    }

    /**
     * Resume game
     */
    async resumeGame() {
        return this.sendAction('PAUSE');
    }

    /**
     * End game
     */
    async endGame() {
        return this.sendAction('END_GAME');
    }

    /**
     * Reset game
     */
    async resetGame() {
        localStorage.removeItem('cseg_player_id');
        localStorage.removeItem('cseg_game_code');
        this.playerId = null;
        return this.sendAction('RESET');
    }

    /**
     * Leave game
     */
    async leaveGame() {
        const result = await this.sendAction('LEAVE');
        localStorage.removeItem('cseg_player_id');
        localStorage.removeItem('cseg_game_code');
        this.playerId = null;
        return result;
    }

    /**
     * Get the current player's assigned snippet (RED round)
     */
    getMySnippet() {
        if (!this.playerId || !this.state.snippetAssignments) return null;
        const snippetId = this.state.snippetAssignments[this.playerId];
        if (!snippetId) return null;
        return (this.state.snippets || []).find(s => s.id === snippetId);
    }

    /**
     * Get the current player's code to work on
     */
    getMyCurrentCode() {
        if (!this.playerId) return '';

        if (this.state.phase === 'RED') {
            return this.state.currentCode?.[this.playerId] || '';
        } else if (this.state.phase === 'BLUE') {
            return this.state.blueCurrentCode?.[this.playerId] || '';
        }
        return '';
    }

    /**
     * Get who I'm fixing code from (BLUE round)
     */
    getBlueAssignment() {
        if (!this.playerId || !this.state.blueAssignments) return null;
        const introducerId = this.state.blueAssignments[this.playerId];
        if (!introducerId) return null;
        return this.state.players?.[introducerId];
    }

    /**
     * Check if current player has submitted
     */
    hasSubmitted() {
        return this.state.submissions?.[this.playerId] === true;
    }

    /**
     * Get submission count for current round
     */
    getSubmissionCount() {
        return Object.values(this.state.submissions || {}).filter(Boolean).length;
    }

    /**
     * Get total active player count
     */
    getPlayerCount() {
        return Object.keys(this.state.players || {}).length;
    }
}

// Create and export singleton instance
export const gameEngine = new GameEngine();

// Export class for testing
export { GameEngine };

