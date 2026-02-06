/**
 * App Component - Simplified routing
 * No spectator mode, simpler route guard
 */

import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GameProvider, useGame, usePlayer } from './GameContext.jsx';
import Home from './ui/Home.jsx';
import Lobby from './ui/Lobby.jsx';
import Editor from './ui/Editor.jsx';
import HostMonitor from './ui/HostMonitor.jsx';
import Leaderboard from './ui/Leaderboard.jsx';
import './index.css';

/**
 * Loading screen during initialization
 */
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading game...</p>
    </div>
  );
}

/**
 * Error screen
 */
function ErrorScreen({ message }) {
  return (
    <div className="error-screen">
      <h1>😵 Error</h1>
      <p>{message || 'Something went wrong'}</p>
      <button onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}

/**
 * Route Guard - Redirects based on game phase
 */
function RouteGuard({ children }) {
  const { state, loading, error } = useGame();
  const { isInGame } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const path = location.pathname;

    // Home is always accessible
    if (path === '/') {
      return;
    }

    // If not in game, send to home
    if (!isInGame && path !== '/') {
      navigate('/', { replace: true });
      return;
    }

    // Route based on game phase if in game
    if (isInGame) {
      switch (state.phase) {
        case 'IDLE':
          if (path !== '/') navigate('/', { replace: true });
          break;
        case 'LOBBY':
          if (path !== '/lobby') navigate('/lobby', { replace: true });
          break;
        case 'RED':
        case 'BLUE':
          if (path !== '/game') navigate('/game', { replace: true });
          break;
        case 'LEADERBOARD':
        case 'ENDED':
          if (path !== '/leaderboard') navigate('/leaderboard', { replace: true });
          break;
      }
    }
  }, [state.phase, loading, isInGame, location.pathname, navigate]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return children;
}

/**
 * Main App
 */
function AppContent() {
  const { isHost } = usePlayer();

  return (
    <RouteGuard>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game" element={isHost ? <HostMonitor /> : <Editor />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RouteGuard>
  );
}

export default function App() {
  return (
    <GameProvider>
      <HashRouter>
        <div className="app">
          <AppContent />
        </div>
      </HashRouter>
    </GameProvider>
  );
}
