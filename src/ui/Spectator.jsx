/**
 * Spectator Component - Redesigned
 * Read-only view of the game for spectators
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext.jsx';
import { generateLeaderboard } from '../core/leaderboardEngine.js';
import { splitLines } from '../core/diffEngine.js';

export default function Spectator() {
    const navigate = useNavigate();
    const { state, engine } = useGame();

    // Redirect if not a spectator and game ends
    useEffect(() => {
        if (state.phase === 'IDLE') {
            navigate('/');
        }
    }, [state.phase, navigate]);

    const snippet = engine.getCurrentSnippet();
    const buggyLines = engine.getBuggyLines();
    const leaderboard = generateLeaderboard(state.players);

    // Get baseline or current code for display
    const displayCode = state.currentSnippetId
        ? state.baselineSnippets[state.currentSnippetId]
        : '';
    const lines = splitLines(displayCode);

    const submissionCount = Object.values(state.submissions).filter(Boolean).length;
    const playerCount = Object.keys(state.players).length;

    const handleLeave = () => {
        localStorage.removeItem('cseg_spectator_id');
        navigate('/');
    };

    const getPhaseInfo = () => {
        switch (state.phase) {
            case 'LOBBY':
                return { icon: '⏳', label: 'In Lobby', color: 'neutral' };
            case 'RED':
                return { icon: '🔴', label: 'RED Round', color: 'red' };
            case 'BLUE':
                return { icon: '🔵', label: 'BLUE Round', color: 'blue' };
            case 'LEADERBOARD':
                return { icon: '📊', label: 'Leaderboard', color: 'neutral' };
            case 'ENDED':
                return { icon: '🏆', label: 'Game Over', color: 'gold' };
            default:
                return { icon: '❓', label: 'Unknown', color: 'neutral' };
        }
    };

    const phaseInfo = getPhaseInfo();

    return (
        <div className={`spectator-container ${state.phase.toLowerCase()}-phase`}>
            {/* Pause Overlay */}
            {state.paused && (
                <div className="pause-overlay">
                    <div className="pause-content">
                        <span className="pause-icon">⏸</span>
                        <h2>GAME PAUSED</h2>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="spectator-header">
                <div className="header-left">
                    <span className="spectator-badge">
                        <span className="badge-icon">👁</span>
                        Spectating
                    </span>
                </div>

                <div className="header-center">
                    <span className={`phase-indicator ${phaseInfo.color}`}>
                        <span className="phase-icon">{phaseInfo.icon}</span>
                        <span className="phase-label">{phaseInfo.label}</span>
                    </span>
                </div>

                <div className="header-right">
                    <button className="leave-button-small" onClick={handleLeave}>
                        ✕ Leave
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="spectator-grid">
                {/* Code Panel */}
                <div className="spectator-panel code-panel">
                    <div className="panel-header">
                        <h3>
                            <span className="panel-icon">💻</span>
                            {snippet?.title || 'Code Snippet'}
                        </h3>
                        {snippet && <code className="language-tag">{snippet.language}</code>}
                    </div>

                    <div className="code-viewer">
                        <div className="line-numbers">
                            {lines.map((_, index) => (
                                <div
                                    key={index}
                                    className={`line-number ${buggyLines.includes(index + 1) ? 'buggy' : ''}`}
                                >
                                    {index + 1}
                                </div>
                            ))}
                        </div>
                        <div className="code-content">
                            {lines.map((line, index) => (
                                <div
                                    key={index}
                                    className={`code-line ${buggyLines.includes(index + 1) ? 'buggy' : ''}`}
                                >
                                    <code>{line || ' '}</code>
                                    {state.phase === 'BLUE' && buggyLines.includes(index + 1) && (
                                        <span className="bug-marker">🐛</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="spectator-sidebar">
                    {/* Progress */}
                    {(state.phase === 'RED' || state.phase === 'BLUE') && (
                        <div className="spectator-panel progress-panel">
                            <h4>Progress</h4>
                            <div className="progress-ring">
                                <svg viewBox="0 0 36 36">
                                    <path
                                        className="progress-bg"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="progress-fill"
                                        strokeDasharray={`${(submissionCount / playerCount) * 100}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <span className="progress-text">{submissionCount}/{playerCount}</span>
                            </div>
                            <p className="progress-label">Submitted</p>
                        </div>
                    )}

                    {/* Leaderboard */}
                    <div className="spectator-panel leaderboard-panel">
                        <h4>
                            <span className="panel-icon">📊</span>
                            Standings
                        </h4>
                        <div className="mini-leaderboard">
                            {leaderboard.map((entry, index) => (
                                <div key={entry.id} className="leaderboard-entry">
                                    <span className="entry-rank">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                    </span>
                                    <span className="entry-name">{entry.name}</span>
                                    <span className="entry-score">{entry.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Players */}
                    <div className="spectator-panel players-panel">
                        <h4>
                            <span className="panel-icon">👥</span>
                            Players
                        </h4>
                        <div className="players-list">
                            {Object.values(state.players).map(player => (
                                <div key={player.id} className="player-entry">
                                    <div className="player-info">
                                        <span className="player-avatar-mini">
                                            {player.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="player-name">
                                            {player.name}
                                            {player.id === state.hostId && <span className="host-icon">👑</span>}
                                        </span>
                                    </div>
                                    <span className={`status-dot ${state.submissions[player.id] ? 'done' : 'working'}`}>
                                        {state.submissions[player.id] ? '✓' : '•'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
