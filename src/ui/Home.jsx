/**
 * Home Page Component - Updated for async API calls
 * Single page with both HOST and JOIN options
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, usePlayer } from '../GameContext.jsx';
import WelcomeScreen from './WelcomeScreen.jsx';

export default function Home() {
    const navigate = useNavigate();
    const { state, engine } = useGame();
    const { isInGame, playerId } = usePlayer();

    const [mode, setMode] = useState(null); // 'host' or 'join'
    const [playerName, setPlayerName] = useState('');
    const [gameCode, setGameCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const codeInputRefs = useRef([]);

    // Check if user can rejoin an existing game
    useEffect(() => {
        if (state.gameCode && isInGame) {
            const phase = state.phase;
            if (phase === 'LOBBY') {
                navigate('/lobby');
            } else if (phase === 'RED' || phase === 'BLUE') {
                navigate('/game');
            } else if (phase === 'LEADERBOARD' || phase === 'ENDED') {
                navigate('/leaderboard');
            }
        }
    }, [state.gameCode, state.phase, isInGame, navigate]);

    // Handle code input change
    const handleCodeChange = (index, value) => {
        const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (char.length <= 1) {
            const newCode = gameCode.padEnd(6, ' ').split('');
            newCode[index] = char;
            setGameCode(newCode.join('').trim());

            if (char && index < 5) {
                codeInputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleCodeKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !gameCode[index] && index > 0) {
            codeInputRefs.current[index - 1]?.focus();
        }
    };

    const handleCodePaste = (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        setGameCode(pastedText);
        if (pastedText.length === 6) {
            codeInputRefs.current[5]?.focus();
        }
    };

    // Host a new game
    const handleHost = async () => {
        setError('');
        setLoading(true);

        try {
            const result = await engine.createGame(playerName);
            if (!result.success) {
                setError(result.message);
                setLoading(false);
                return;
            }

            navigate('/lobby');
        } catch (err) {
            setError(err.message || 'Failed to create game');
            setLoading(false);
        }
    };

    // Join existing game
    const handleJoin = async () => {
        setError('');

        if (gameCode.length !== 6) {
            setError('Please enter a 6-character game code');
            return;
        }

        setLoading(true);

        try {
            const result = await engine.joinGame(playerName, gameCode);
            if (!result.success) {
                setError(result.message);
                setLoading(false);
                return;
            }

            navigate('/lobby');
        } catch (err) {
            setError(err.message || 'Failed to join game');
            setLoading(false);
        }
    };

    // Rejoin existing session
    const handleRejoin = () => {
        if (state.phase === 'LOBBY') {
            navigate('/lobby');
        } else if (state.phase === 'RED' || state.phase === 'BLUE') {
            navigate('/game');
        } else {
            navigate('/leaderboard');
        }
    };

    // Show rejoin option if there's a saved session
    const savedPlayerId = localStorage.getItem('cseg_player_id');
    const canRejoin = savedPlayerId &&
        state.gameCode &&
        state.players[savedPlayerId];

    // Splash Screen State
    const [showSplash, setShowSplash] = useState(true);

    if (showSplash) {
        return <WelcomeScreen onStart={() => setShowSplash(false)} />;
    }

    return (
        <div className="home-container">
            <div className="home-content">
                {/* Header */}
                <header className="home-header">
                    <div className="logo-container">
                        <span className="logo-icon">🎮</span>
                        <h1 className="game-title">CSEG</h1>
                    </div>
                    <p className="game-subtitle">Code Snippet Exchange Game</p>
                </header>

                {/* Rejoin Banner */}
                {canRejoin && (
                    <div className="rejoin-banner">
                        <div className="rejoin-info">
                            <span className="rejoin-icon">🔄</span>
                            <div>
                                <strong>Game in Progress</strong>
                                <p>You're in game as {state.players[savedPlayerId]?.name}</p>
                            </div>
                        </div>
                        <button className="rejoin-button" onClick={handleRejoin}>
                            Rejoin
                        </button>
                    </div>
                )}

                {/* Mode Selection */}
                {!mode && (
                    <>
                        {/* Rules */}
                        <section className="rules-section">
                            <h2 className="section-title">
                                <span className="section-icon">📜</span>
                                How to Play
                            </h2>

                            <div className="rules-grid">
                                <div className="rule-card red-card">
                                    <div className="rule-number">1</div>
                                    <div className="rule-content">
                                        <span className="round-badge red">🔴 RED ROUND</span>
                                        <h3>Introduce Bugs</h3>
                                        <p>Modify <strong>3–5 lines</strong> of code to introduce subtle bugs.</p>
                                    </div>
                                </div>

                                <div className="rule-card blue-card">
                                    <div className="rule-number">2</div>
                                    <div className="rule-content">
                                        <span className="round-badge blue">🔵 BLUE ROUND</span>
                                        <h3>Fix Bugs</h3>
                                        <p>Find and fix bugs introduced by others. Only buggy lines are editable.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="scoring-grid">
                                <div className="score-item success">
                                    <span className="score-value">+3</span>
                                    <span className="score-label">Bug Fixed</span>
                                    <span className="score-desc">Points to fixer</span>
                                </div>
                                <div className="score-item danger">
                                    <span className="score-value">+2</span>
                                    <span className="score-label">Bug Survives</span>
                                    <span className="score-desc">Points to introducer</span>
                                </div>
                            </div>
                        </section>

                        {/* Mode Selection Buttons */}
                        <section className="mode-selection">
                            <button
                                className="mode-button host"
                                onClick={() => setMode('host')}
                            >
                                <span className="mode-icon">👑</span>
                                <span className="mode-title">Host Game</span>
                                <span className="mode-desc">Create a new game session</span>
                            </button>

                            <button
                                className="mode-button join"
                                onClick={() => setMode('join')}
                            >
                                <span className="mode-icon">🎯</span>
                                <span className="mode-title">Join Game</span>
                                <span className="mode-desc">Enter a code to join</span>
                            </button>
                        </section>
                    </>
                )}

                {/* Host Form */}
                {mode === 'host' && (
                    <section className="form-section">
                        <button className="back-button" onClick={() => { setMode(null); setError(''); }}>
                            ← Back
                        </button>

                        <h2 className="form-title">
                            <span className="form-icon">👑</span>
                            Host New Game
                        </h2>

                        <div className="input-group">
                            <label htmlFor="hostName">Your Name</label>
                            <input
                                id="hostName"
                                type="text"
                                placeholder="Enter your name..."
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="name-input"
                                maxLength={20}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && !loading && handleHost()}
                            />
                        </div>

                        {error && (
                            <div className="error-message">
                                <span className="error-icon">⚠️</span>
                                {error}
                            </div>
                        )}

                        <button
                            className="action-button primary"
                            onClick={handleHost}
                            disabled={loading || !playerName.trim()}
                        >
                            <span className="button-icon">🚀</span>
                            {loading ? 'Creating...' : 'Create Game'}
                        </button>
                    </section>
                )}

                {/* Join Form */}
                {mode === 'join' && (
                    <section className="form-section">
                        <button className="back-button" onClick={() => { setMode(null); setError(''); }}>
                            ← Back
                        </button>

                        <h2 className="form-title">
                            <span className="form-icon">🎯</span>
                            Join Game
                        </h2>

                        <div className="code-entry-section">
                            <label>Game Code</label>
                            <div className="code-input-row" onPaste={handleCodePaste}>
                                {[0, 1, 2, 3, 4, 5].map(i => (
                                    <input
                                        key={i}
                                        ref={el => codeInputRefs.current[i] = el}
                                        type="text"
                                        maxLength={1}
                                        className="code-input"
                                        value={gameCode[i] || ''}
                                        onChange={(e) => handleCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="playerName">Your Name</label>
                            <input
                                id="playerName"
                                type="text"
                                placeholder="Enter your name..."
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="name-input"
                                maxLength={20}
                                onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && gameCode.length === 6 && !loading && handleJoin()}
                            />
                        </div>

                        {error && (
                            <div className="error-message">
                                <span className="error-icon">⚠️</span>
                                {error}
                            </div>
                        )}

                        <button
                            className="action-button primary"
                            onClick={handleJoin}
                            disabled={loading || !playerName.trim() || gameCode.length !== 6}
                        >
                            <span className="button-icon">→</span>
                            {loading ? 'Joining...' : 'Join Game'}
                        </button>
                    </section>
                )}

                {/* Footer */}
                <footer className="home-footer">
                    <p>Built with React • LAN Multiplayer</p>
                </footer>
            </div>
        </div>
    );
}
