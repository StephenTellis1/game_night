import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Note: StrictMode removed to prevent double-mounting which causes WebSocket issues
createRoot(document.getElementById('root')).render(<App />);
