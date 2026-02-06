/**
 * Game Context - Provides game state to all components
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { gameEngine } from './core/gameEngine.js';

// Create context
const GameContext = createContext(null);

/**
 * Game Provider component
 */
export function GameProvider({ children }) {
    const [state, setState] = useState(gameEngine.getState());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize game engine on mount
    useEffect(() => {
        const init = async () => {
            try {
                const result = await gameEngine.initialize();
                if (!result.success) {
                    setError(result.error || 'Failed to connect to server. Make sure the backend is running.');
                }
            } catch (err) {
                console.error('Init error:', err);
                setError('Cannot connect to game server. Please start the backend server first.');
            }
            setLoading(false);
        };

        init();

        // Subscribe to state changes
        const unsubscribe = gameEngine.subscribe(setState);
        return unsubscribe;
    }, []);

    // Memoized context value
    const value = {
        state,
        loading,
        error,
        engine: gameEngine
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

/**
 * Hook to use game context
 */
export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

/**
 * Hook for player-specific data
 */
export function usePlayer() {
    const { state, engine } = useGame();
    const playerId = engine.getCurrentPlayerId();
    const player = playerId ? state.players[playerId] : null;
    const isHost = engine.isHost();

    return {
        playerId,
        player,
        isHost,
        isInGame: Boolean(player)
    };
}
