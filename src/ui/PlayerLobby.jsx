/**
 * Player Lobby - For players who joined
 * Shows waiting state with game info
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, usePlayer } from '../GameContext.jsx';

export default function PlayerLobby() {
    const navigate = useNavigate();
    const { state, engine } = useGame();
    const { player, playerId } = usePlayer();

    // Redirect if game moves to next phase
    useEffect(() => {
        if (state.phase === 'RED' || state.phase === 'BLUE') {
            navigate('/game');
        } else if (state.phase === 'LEADERBOARD' || state.phase === 'ENDED') {
            navigate('/leaderboard');
        } else if (state.phase === 'IDLE') {
            navigate('/');
        }
    }, [state.phase, navigate]);

    const playerCount = Object.values(state.players).filter(p => p.id !== state.hostId).length;
    const hostPlayer = state.players[state.hostId];

    const handleLeave = async () => {
        if (confirm('Leave the game?')) {
            await engine.leaveGame();
            navigate('/');
        }
    };

    return (
        <div className="lobby-container player-lobby">
            <div className="lobby-content">
                {/* Header */}
                <header className="lobby-header">
                    <div className="connected-badge">
                        <span className="pulse-dot"></span>
                        Connected
                    </div>
                    <h1>Waiting for Host</h1>
                    <p className="header-subtitle">
                        {hostPlayer?.name || 'Host'} will start the game
                    </p>
                </header>

                {/* Your Info */}
                <section className="your-info">
                    <div className="your-avatar">
                        {player?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="your-name">{player?.name || 'You'}</div>
                    <div className="ready-status">
                        <span className="check-icon">✓</span> Ready
                    </div>
                </section>

                {/* Waiting Animation */}
                <section className="waiting-display">
                    <div className="waiting-dots">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                    <p className="waiting-message">Game will start soon...</p>
                </section>

                {/* Other Players */}
                <section className="other-players">
                    <h3>
                        Players in Lobby
                        <span className="count-badge">{playerCount}</span>
                    </h3>

                    <div className="player-list-compact">
                        {Object.values(state.players)
                            .filter(p => p.id !== state.hostId)
                            .map((p) => (
                                <div
                                    key={p.id}
                                    className={`player-item ${p.id === playerId ? 'you' : ''}`}
                                >
                                    <span className="player-dot"></span>
                                    <span className="player-name">{p.name}</span>
                                    {p.id === playerId && <span className="you-tag">You</span>}
                                </div>
                            ))}
                    </div>
                </section>

                {/* Leave */}
                <button className="leave-button-secondary" onClick={handleLeave}>
                    🚪 Leave Game
                </button>
            </div>
        </div>
    );
}
