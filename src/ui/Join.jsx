/**
 * Join Page Component - Updated with game code entry
 * Players enter a 6-char code to join a game
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, usePlayer } from '../GameContext.jsx';

export default function Join() {
    const navigate = useNavigate();
    const { state, engine } = useGame();
    const { isInGame } = usePlayer();
    const [playerName, setPlayerName] = useState('');
    const [gameCode, setGameCode] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState('code'); // 'code' or 'name'
    const codeInputRefs = useRef([]);

    // If already in game, redirect
    useEffect(() => {
        if (isInGame) {
            if (state.phase === 'LOBBY') {
                navigate('/lobby');
            } else if (state.phase === 'RED' || state.phase === 'BLUE') {
                navigate('/game');
            } else if (state.phase === 'LEADERBOARD' || state.phase === 'ENDED') {
                navigate('/leaderboard');
            }
        }
    }, [isInGame, state.phase, navigate]);

    // Check if there's an active game and automatically go to name step
    useEffect(() => {
        if (state.gameCode && !isInGame) {
            setGameCode(state.gameCode);
            setStep('name');
        }
    }, [state.gameCode, isInGame]);

    // Handle code input change
    const handleCodeChange = (index, value) => {
        // Only allow alphanumeric
        const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (char.length <= 1) {
            const newCode = gameCode.split('');
            newCode[index] = char;
            setGameCode(newCode.join(''));

            // Move to next input
            if (char && index < 5) {
                codeInputRefs.current[index + 1]?.focus();
            }
        }
    };

    // Handle backspace
    const handleCodeKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !gameCode[index] && index > 0) {
            codeInputRefs.current[index - 1]?.focus();
        } else if (e.key === 'Enter' && gameCode.length === 6) {
            handleVerifyCode();
        }
    };

    // Handle paste
    const handleCodePaste = (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        setGameCode(pastedText);
        if (pastedText.length === 6) {
            codeInputRefs.current[5]?.focus();
        }
    };

    // Verify the game code
    const handleVerifyCode = () => {
        setError('');

        if (gameCode.length !== 6) {
            setError('Please enter a 6-character code');
            return;
        }

        // Check if code matches current game
        if (state.gameCode === gameCode) {
            if (state.joiningDisabled) {
                setError('This game has already started. You can only spectate.');
                return;
            }
            setStep('name');
        } else {
            setError('Invalid game code. Check the code and try again.');
        }
    };

    // Join the game
    const handleJoin = () => {
        setError('');

        const result = engine.joinGame(playerName, gameCode);
        if (!result.success) {
            setError(result.message);
            return;
        }

        if (state.phase === 'LOBBY') {
            navigate('/lobby');
        } else {
            navigate('/game');
        }
    };

    const handleSpectate = () => {
        engine.joinAsSpectator();
        navigate('/spectator');
    };

    const handleBack = () => {
        setStep('code');
        setError('');
    };

    // No active game to join
    if (!state.gameCode && step === 'code') {
        return (
            <div className="join-container">
                <div className="join-content">
                    <div className="no-game-state">
                        <span className="state-icon">🎮</span>
                        <h1>Join a Game</h1>
                        <p>Enter a game code to join, or start your own!</p>

                        {/* Still show code entry for when game is created */}
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
                            {error && (
                                <div className="error-message">
                                    <span className="error-icon">⚠️</span>
                                    {error}
                                </div>
                            )}
                            <button
                                className="action-button primary"
                                onClick={handleVerifyCode}
                                disabled={gameCode.length !== 6}
                            >
                                <span className="button-icon">🔍</span>
                                Find Game
                            </button>
                        </div>

                        <div className="divider"><span>or</span></div>

                        <button
                            className="action-button secondary"
                            onClick={() => navigate('/')}
                        >
                            <span className="button-icon">🚀</span>
                            Start Your Own Game
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Enter code
    if (step === 'code') {
        return (
            <div className="join-container">
                <div className="join-content">
                    <header className="join-header">
                        <span className="header-icon">🎮</span>
                        <h1>Join Game</h1>
                    </header>

                    <div className="code-entry-section">
                        <label>Enter Game Code</label>
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

                        {error && (
                            <div className="error-message">
                                <span className="error-icon">⚠️</span>
                                {error}
                            </div>
                        )}

                        <button
                            className="action-button primary"
                            onClick={handleVerifyCode}
                            disabled={gameCode.length !== 6}
                        >
                            <span className="button-icon">→</span>
                            Continue
                        </button>

                        <button
                            className="text-button"
                            onClick={() => navigate('/')}
                        >
                            ← Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Enter name (code verified)
    return (
        <div className="join-container">
            <div className="join-content">
                <header className="join-header">
                    <span className="header-icon">🎮</span>
                    <h1>Join Game</h1>
                </header>

                {/* Game Info */}
                <div className="game-info-card">
                    <div className="info-row">
                        <span className="info-label">Game Code</span>
                        <span className="info-value code-value">{gameCode}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Players</span>
                        <span className="info-value">{Object.keys(state.players).length} in lobby</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Phase</span>
                        <span className="info-value phase-badge">{state.phase}</span>
                    </div>
                </div>

                {/* Joining disabled */}
                {state.joiningDisabled ? (
                    <div className="join-disabled-notice">
                        <span className="notice-icon">🚫</span>
                        <p>This game has already started. You can watch as a spectator.</p>
                        <button
                            className="action-button secondary"
                            onClick={handleSpectate}
                        >
                            <span className="button-icon">👁</span>
                            Watch as Spectator
                        </button>
                        <button className="text-button" onClick={() => navigate('/')}>
                            Start your own game
                        </button>
                    </div>
                ) : (
                    /* Join Form */
                    <div className="join-form">
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
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && handleJoin()}
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
                            disabled={!playerName.trim()}
                        >
                            <span className="button-icon">🎯</span>
                            Join Game
                        </button>

                        <div className="divider"><span>or</span></div>

                        <button
                            className="action-button secondary"
                            onClick={handleSpectate}
                        >
                            <span className="button-icon">👁</span>
                            Watch as Spectator
                        </button>

                        <button className="text-button" onClick={handleBack}>
                            ← Use different code
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
