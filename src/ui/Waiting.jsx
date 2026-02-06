/**
 * Waiting Component
 * Displays waiting states and pause overlays
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameEngine } from '../core/gameEngine.js';

export default function Waiting({ message = 'Waiting...', showLeave = true }) {
    const navigate = useNavigate();
    const [state, setState] = useState(gameEngine.getState());
    const [dots, setDots] = useState('');

    useEffect(() => {
        const unsubscribe = gameEngine.subscribe(setState);
        return unsubscribe;
    }, []);

    // Animated dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const handleLeave = () => {
        gameEngine.resetGame();
        navigate('/');
    };

    return (
        <div className="waiting-container">
            <div className="waiting-content">
                <div className="waiting-animation">
                    <div className="spinner"></div>
                </div>

                <h2 className="waiting-message">
                    {message}{dots}
                </h2>

                {state.paused && (
                    <div className="pause-notice">
                        <span className="pause-icon">⏸</span>
                        <p>Game is currently paused</p>
                    </div>
                )}

                <div className="game-info">
                    <p>Players in game: {Object.values(state.players).filter(p => p.id !== state.hostId).length}</p>
                    <p>Current phase: {state.phase}</p>
                </div>

                {showLeave && (
                    <button className="leave-button" onClick={handleLeave}>
                        🚪 Leave Game
                    </button>
                )}
            </div>
        </div>
    );
}
