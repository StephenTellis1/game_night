/**
 * Lobby - Routes to HostLobby or PlayerLobby based on role
 */

import { usePlayer } from '../GameContext.jsx';
import HostLobby from './HostLobby.jsx';
import PlayerLobby from './PlayerLobby.jsx';

export default function Lobby() {
    const { isHost } = usePlayer();

    return isHost ? <HostLobby /> : <PlayerLobby />;
}
