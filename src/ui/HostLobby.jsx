/**
 * Host Lobby - For the game host
 * Shows game code prominently, player list, and controls to start
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, usePlayer } from '../GameContext.jsx';

export default function HostLobby() {
    const navigate = useNavigate();
    const { state, engine } = useGame();
    const { player } = usePlayer();
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

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

    const playerCount = Object.keys(state.players).length;
    const gameCode = state.gameCode || '------';

    const handleStartRedRound = async () => {
        setLoading(true);
        const result = await engine.startRedRound();
        setLoading(false);

        if (result.success) {
            navigate('/game');
        } else {
            alert(result.message);
        }
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(gameCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = gameCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCancel = async () => {
        if (confirm('Cancel game? All players will be disconnected.')) {
            await engine.resetGame();
            navigate('/');
        }
    };

    return (
        <div className="lobby-container host-lobby">
            <div className="lobby-content">
                {/* Header */}
                <header className="lobby-header">
                    <div className="host-crown">👑</div>
                    <h1>You're the Host</h1>
                    <p className="header-subtitle">Share the code below with players</p>
                </header>

                {/* Giant Game Code */}
                <section className="game-code-hero">
                    <div className="code-label">GAME CODE</div>
                    <div className="game-code-giant">
                        {gameCode.split('').map((char, i) => (
                            <span key={i} className="code-char-giant">{char}</span>
                        ))}
                    </div>
                    <button
                        onClick={handleCopyCode}
                        className={`copy-button-large ${copied ? 'copied' : ''}`}
                    >
                        {copied ? '✓ Copied!' : '📋 Copy Code'}
                    </button>
                </section>

                {/* Waiting Players */}
                <section className="players-waiting">
                    <div className="players-header">
                        <h3>Players Ready</h3>
                        {/* Exclude host from count */}
                        <span className="player-count-badge">
                            {Object.values(state.players).filter(p => p.id !== state.hostId).length}
                        </span>
                    </div>

                    <div className="player-list">
                        {Object.values(state.players)
                            .filter(p => p.id !== state.hostId)
                            .map((p, index) => (
                                <div
                                    key={p.id}
                                    className="player-chip"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <span className="player-avatar-small">
                                        {p.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="player-name">{p.name}</span>
                                </div>
                            ))}
                        {Object.values(state.players).filter(p => p.id !== state.hostId).length === 0 && (
                            <div className="text-text-muted italic px-4">Waiting for players to join...</div>
                        )}
                    </div>
                </section>

                <section className="monitor-mode-notice" style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--bg-elevated)',
                    textAlign: 'center'
                }}>
                    <h4 style={{ color: 'var(--blue-light)', marginBottom: '0.5rem' }}>🖥️ Monitor Mode Active</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        You are hosting this game. You will monitor progress and control the rounds, but you won't write code.
                    </p>
                </section>

                {/* Start Controls */}
                <section className="start-controls">
                    <button
                        className="start-button"
                        onClick={handleStartRedRound}
                        disabled={playerCount < 2 || loading}
                    >
                        <span className="start-icon">🚀</span>
                        <span className="start-text">
                            {loading ? 'Starting...' : 'Start Game'}
                        </span>
                    </button>

                    {playerCount < 2 && (
                        <p className="start-hint">
                            ⚠️ Waiting for at least 1 more player
                        </p>
                    )}
                    {playerCount >= 2 && (
                        <p className="start-hint success">
                            ✓ Ready to start with {playerCount} players
                        </p>
                    )}
                </section>

                {/* Cancel */}
                <button className="cancel-link" onClick={handleCancel}>
                    Cancel Game
                </button>
            </div>
        </div>
    );
}
