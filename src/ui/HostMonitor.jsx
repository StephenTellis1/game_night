import React from 'react';
import { useGame, usePlayer } from '../GameContext.jsx';

export default function HostMonitor() {
    const { state, engine } = useGame();
    const { playerId } = usePlayer();
    const { gameCode, players, phase, currentRound, submissions } = state;

    const playerList = Object.values(players).filter(p => p.id !== state.hostId);
    const submittedCount = Object.values(submissions).filter(Boolean).length;
    const isVerifyScores = phase === 'VERIFY_SCORES';

    /* ... handlers ... */
    const handleUpdateScore = (targetPlayerId, newScore) => {
        engine.sendAction('UPDATE_SCORE', { targetPlayerId, newScore });
    };

    const handleConfirmScores = () => {
        if (confirm("Are you sure you want to finalize these scores?")) {
            engine.sendAction('CONFIRM_SCORES');
        }
    };

    if (phase === 'LEADERBOARD' || phase === 'ENDED') {
        return <div className="loading-screen">Redirecting to Leaderboard...</div>;
    }

    return (
        <div className="host-monitor">
            {/* Header */}
            <div className="monitor-header">
                <div className="monitor-title">
                    <h1>Host Monitor</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Game Code: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{gameCode}</span>
                    </p>
                </div>
                <div className="monitor-stats">
                    <div className="stat-card">
                        <span className="stat-label">Round</span>
                        <span className="stat-value">{currentRound}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Phase</span>
                        <span className="stat-value" style={{ color: isVerifyScores ? 'var(--yellow-primary)' : (isRed ? 'var(--red-primary)' : 'var(--blue-primary)') }}>
                            {phase.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="monitor-grid">

                {/* Main Content Area */}
                {isVerifyScores ? (
                    <div className="player-status-section" style={{ gridColumn: '1 / -1' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h2>Verify Scores</h2>
                            <p className="text-text-muted">Adjust scores if necessary before proceeding.</p>
                        </div>

                        <div className="score-verification-table" style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '1rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--bg-elevated)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.5rem' }}>Player</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Score</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {playerList.map(p => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--bg-elevated)' }}>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <div className="flex items-center gap-2">
                                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                                {p.score}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleUpdateScore(p.id, p.score - 1)}
                                                    style={{ padding: '4px 8px', marginRight: '8px', background: 'var(--red-primary)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                                                >
                                                    -1
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateScore(p.id, p.score + 1)}
                                                    style={{ padding: '4px 8px', background: 'var(--green-primary)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                                                >
                                                    +1
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={handleConfirmScores}
                                    style={{
                                        padding: '0.75rem 2rem',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        borderRadius: 'var(--radius-md)',
                                        border: 'none',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '1.1rem'
                                    }}
                                >
                                    ✅ Verify & Proceed to Leaderboard
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Player Status List (Normal Game Phase) */
                    <div className="player-status-section">
                        <div className="flex justify-between items-center mb-4">
                            <h2 style={{ fontSize: '1.25rem' }}>Player Status</h2>
                            <span className="text-text-muted">
                                {submittedCount} / {playerList.length} Submitted
                            </span>
                        </div>

                        <div className="player-status-grid">
                            {playerList.map(player => {
                                const hasSubmitted = submissions[player.id];
                                return (
                                    <div key={player.id} className={`player-monitor-card ${hasSubmitted ? 'submitted' : 'working'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span style={{ fontWeight: 600 }}>{player.name}</span>
                                            <span style={{ fontSize: '0.8rem', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                {player.score} pts
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div style={{
                                                width: '10px', height: '10px', borderRadius: '50%',
                                                background: hasSubmitted ? 'var(--green-primary)' : 'var(--yellow-primary)',
                                                animation: hasSubmitted ? 'none' : 'pulse 1.5s infinite'
                                            }}></div>
                                            <span style={{ fontSize: '0.85rem', color: hasSubmitted ? 'var(--green-light)' : 'var(--yellow-primary)' }}>
                                                {hasSubmitted ? 'Ready' : (isRed ? 'Bugging Code...' : 'Fixing Bugs...')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {playerList.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                No players in game.
                            </div>
                        )}
                    </div>
                )}

                {/* Control Panel: Only show if NOT verifying (verify has its own controls) */}
                {!isVerifyScores && (
                    <div className="monitor-controls">
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Controls</h2>

                        <div className="space-y-4">
                            {isRed && (
                                <div className="control-group">
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                        Wait for all players to submit their buggy code before starting the Blue Round.
                                    </p>
                                    <button
                                        className="submit-button"
                                        onClick={handleStartBlue}
                                        disabled={submittedCount < 2}
                                        style={{ width: '100%', background: submittedCount < 2 ? 'var(--bg-elevated)' : 'var(--blue-primary)' }}
                                    >
                                        Start Blue Round
                                    </button>
                                    {submittedCount < 2 && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--red-light)', marginTop: '0.5rem', textAlign: 'center' }}>
                                            Need 2+ submissions
                                        </p>
                                    )}
                                </div>
                            )}

                            {isBlue && (
                                <div className="control-group">
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                        End the round once everyone has finished debugging.
                                    </p>
                                    <button
                                        className="submit-button"
                                        onClick={handleEndRound}
                                        style={{ width: '100%', background: 'var(--green-primary)' }}
                                    >
                                        End Round & Verify Scores
                                    </button>
                                </div>
                            )}

                            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--bg-elevated)' }}>
                                <button
                                    onClick={handlePause}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                                        background: 'transparent', border: '1px solid var(--bg-elevated)',
                                        color: 'var(--text-secondary)', cursor: 'pointer'
                                    }}
                                >
                                    ⏸ Pause Game
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
