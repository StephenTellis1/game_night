/**
 * Leaderboard Component
 * Shows scores after each round and final results
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, usePlayer } from '../GameContext.jsx';

export default function Leaderboard() {
    const navigate = useNavigate();
    const { state, engine } = useGame();
    const { isHost, playerId } = usePlayer();

    const isEnded = state.phase === 'ENDED';
    const players = Object.values(state.players || {}).filter(p => p.id !== state.hostId);
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    // Redirect if game restarts
    useEffect(() => {
        if (state.phase === 'RED' || state.phase === 'BLUE') {
            navigate('/game');
        } else if (state.phase === 'LOBBY') {
            navigate('/lobby');
        } else if (state.phase === 'IDLE') {
            navigate('/');
        }
    }, [state.phase, navigate]);

    const handleNextRound = useCallback(async () => {
        const result = await engine.startNextRound();
        if (result.success && !result.ended) {
            navigate('/game');
        }
    }, [engine, navigate]);

    const handleEndGame = useCallback(async () => {
        await engine.endGame();
    }, [engine]);

    const handlePlayAgain = useCallback(async () => {
        await engine.resetGame();
        navigate('/');
    }, [engine, navigate]);

    // Get medal for position
    const getMedal = (position) => {
        if (position === 0) return '🥇';
        if (position === 1) return '🥈';
        if (position === 2) return '🥉';
        return null;
    };

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-content">
                {/* Header */}
                <header className="leaderboard-header">
                    <h1>
                        {state.phase === 'VERIFY_SCORES' ? '⏳ Verifying Scores...' :
                            (isEnded ? '🏆 Final Results' : '📊 Round Results')}
                    </h1>
                    <p className="round-info">
                        {state.phase === 'VERIFY_SCORES' ? 'Host is verifying the results' :
                            (isEnded ? 'Game Complete!' : `Round ${state.currentRound} Complete`)}
                    </p>
                </header>

                {/* Standings */}
                <section className="standings">
                    {sortedPlayers.map((player, index) => (
                        <div
                            key={player.id}
                            className={`standing-row ${player.id === playerId ? 'you' : ''} ${index === 0 ? 'leader' : ''}`}
                        >
                            <div className="position">
                                {getMedal(index) || `#${index + 1}`}
                            </div>
                            <div className="player-info-row">
                                <span className="player-avatar-inline">
                                    {player.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="player-name-inline">
                                    {player.name}
                                    {player.id === playerId && <span className="you-indicator">(You)</span>}
                                    {player.id === state.hostId && <span className="host-indicator">👑</span>}
                                </span>
                            </div>
                            <div className="score">
                                <span className="score-value">{player.score}</span>
                                <span className="score-label">pts</span>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Scoring Info */}
                <section className="scoring-legend">
                    <h4>Scoring</h4>
                    <div className="legend-items">
                        <span>🔧 Bug Fixed: +{state.config?.points?.bugFixed || 3} pts</span>
                        <span>🐛 Bug Survived: +{state.config?.points?.bugSurvived || 2} pts</span>
                    </div>
                </section>

                {/* Host Controls */}
                {isHost && (
                    <section className="leaderboard-actions">
                        {isEnded ? (
                            <button className="action-button primary" onClick={handlePlayAgain}>
                                🔄 Play Again
                            </button>
                        ) : (
                            <>
                                <button className="action-button primary" onClick={handleNextRound}>
                                    ▶️ Next Round
                                </button>
                                <button className="action-button secondary" onClick={handleEndGame}>
                                    🏁 End Game
                                </button>
                            </>
                        )}
                    </section>
                )}

                {/* Non-host waiting */}
                {!isHost && !isEnded && (
                    <div className="waiting-message">
                        <div className="waiting-dots-small">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                        <p>Waiting for host to continue...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
