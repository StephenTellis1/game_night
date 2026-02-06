/**
 * Editor Component - Redesigned for per-player snippets
 * 
 * RED Round: Player bugs their assigned snippet
 * BLUE Round: Player fixes someone else's bugged code
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, usePlayer } from '../GameContext.jsx';

export default function Editor() {
    const navigate = useNavigate();
    const { state, engine } = useGame();
    const { playerId, isHost, player } = usePlayer();

    // Local code state for smooth editing
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [lineCount, setLineCount] = useState(0);
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);

    const isRedRound = state.phase === 'RED';
    const isBluRound = state.phase === 'BLUE';
    const hasSubmitted = engine.hasSubmitted();
    const submissionCount = engine.getSubmissionCount();
    const playerCount = engine.getPlayerCount();

    // Get the snippet info for display
    const mySnippet = engine.getMySnippet();
    const blueAssignment = engine.getBlueAssignment();

    // Initialize code when entering editor
    useEffect(() => {
        const currentCode = engine.getMyCurrentCode();
        if (currentCode) {
            setCode(currentCode);
        }
    }, [state.phase, state.currentCode, state.blueCurrentCode, playerId]);

    // Update line count
    useEffect(() => {
        setLineCount(code.split('\n').length);
    }, [code]);

    // Redirect based on phase
    useEffect(() => {
        if (state.phase === 'LOBBY') {
            navigate('/lobby');
        } else if (state.phase === 'LEADERBOARD' || state.phase === 'ENDED' || state.phase === 'VERIFY_SCORES') {
            navigate('/leaderboard');
        } else if (state.phase === 'IDLE') {
            navigate('/');
        }
    }, [state.phase, navigate]);

    // Handle code change
    const handleCodeChange = useCallback((e) => {
        const newCode = e.target.value;
        setCode(newCode);
        setError(null);

        // Debounce sending to server
        if (window.codeUpdateTimeout) {
            clearTimeout(window.codeUpdateTimeout);
        }
        window.codeUpdateTimeout = setTimeout(() => {
            engine.updateCode(playerId, newCode);
        }, 500);
    }, [engine, playerId]);

    // Handle submission
    const handleSubmit = useCallback(async () => {
        if (hasSubmitted || submitting) return;

        setSubmitting(true);
        setError(null);

        // Send final code update
        await engine.updateCode(playerId, code);

        // Submit based on round
        let result;
        if (isRedRound) {
            result = await engine.submitRedRound(playerId);
        } else if (isBluRound) {
            result = await engine.submitBlueRound(playerId);
        }

        setSubmitting(false);

        if (!result.success) {
            setError(result.message);
        }
    }, [hasSubmitted, submitting, code, playerId, engine, isRedRound, isBluRound]);

    // Host controls for advancing phases
    const handleStartBlue = useCallback(async () => {
        const result = await engine.startBlueRound();
        if (!result.success) {
            setError(result.message);
        }
    }, [engine]);

    const handleEndRound = useCallback(async () => {
        const result = await engine.endRoundPair();
        if (!result.success) {
            setError(result.message);
        }
    }, [engine]);

    // Sync scroll between textarea and line numbers
    const handleScroll = useCallback(() => {
        if (lineNumbersRef.current && textareaRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }, []);

    // Generate line numbers
    const lineNumbers = [];
    for (let i = 1; i <= lineCount; i++) {
        lineNumbers.push(
            <div key={i} className="line-number">
                {i}
            </div>
        );
    }

    return (
        <div className="editor-container">
            {/* Header */}
            <header className="editor-header">
                <div className="round-indicator">
                    <span className={`round-badge ${isRedRound ? 'red' : 'blue'}`}>
                        {isRedRound ? '🔴 BUG IT' : '🔵 FIX IT'}
                    </span>
                    <span className="round-number">Round {state.currentRound}</span>
                </div>

                <div className="player-info-compact">
                    <span className="player-name" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                        Player: {player?.name}
                    </span>
                    <span className="player-score">{player?.score || 0} pts</span>
                </div>
            </header>

            {/* Instructions */}
            <div className={`instruction-banner ${isRedRound ? 'red' : 'blue'}`}>
                {isRedRound ? (
                    <div className="flex flex-col items-center">
                        <strong style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🐛 BUG IT!</strong>
                        <span>Introduce a min of {state.config?.minBugs || 3} and max of {state.config?.maxBugs || 5} bugs into this code</span>
                    </div>
                ) : (
                    <>
                        <strong>🔧 FIX IT!</strong>
                        <span>Find and fix the bugs in this code.</span>
                        {blueAssignment && <span className="assignment-info">Bugged by: {blueAssignment.name}</span>}
                    </>
                )}
            </div>

            {/* Snippet Name (Outside Red Banner) */}
            {isRedRound && mySnippet && (
                <div className="snippet-info-bar" style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--bg-elevated)', marginBottom: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    Snippet: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{mySnippet.title}</span>
                </div>
            )}

            {/* Code Editor */}
            <div className="code-editor-wrapper">
                <div className="line-numbers" ref={lineNumbersRef}>
                    {lineNumbers}
                </div>
                <textarea
                    ref={textareaRef}
                    className="code-textarea"
                    value={code}
                    onChange={handleCodeChange}
                    onScroll={handleScroll}
                    disabled={hasSubmitted || state.paused}
                    spellCheck={false}
                    placeholder="Loading code..."
                />
            </div>

            {/* Error display */}
            {error && (
                <div className="error-banner">
                    ⚠️ {error}
                </div>
            )}

            {/* Footer */}
            <footer className="editor-footer">
                <div className="submission-status">
                    {hasSubmitted ? (
                        <span className="status-submitted">✓ Submitted - Waiting for others ({submissionCount}/{playerCount})</span>
                    ) : (
                        <span className="status-pending">Ready to submit</span>
                    )}
                </div>

                <div className="editor-actions">
                    {!hasSubmitted && (
                        <button
                            className={`submit-button ${isRedRound ? 'red' : 'blue'}`}
                            onClick={handleSubmit}
                            disabled={submitting || state.paused}
                        >
                            {submitting ? 'Submitting...' : (isRedRound ? 'Submit Bugs' : 'Submit Fixes')}
                        </button>
                    )}

                    {/* Host controls */}
                    {isHost && hasSubmitted && (
                        <div className="host-controls-inline">
                            {isRedRound && submissionCount >= 2 && (
                                <button className="action-button" onClick={handleStartBlue}>
                                    🔵 Start Blue Round
                                </button>
                            )}
                            {isBluRound && submissionCount >= 1 && (
                                <button className="action-button" onClick={handleEndRound}>
                                    📊 Show Results
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </footer>

            {/* Pause overlay */}
            {state.paused && (
                <div className="pause-overlay">
                    <div className="pause-content">
                        <span className="pause-icon">⏸️</span>
                        <h2>Game Paused</h2>
                        <p>Waiting for host to resume...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
