/**
 * Leaderboard Engine - Generates and manages leaderboards
 */

/**
 * Generate a leaderboard from current player scores
 * Sorted in descending order by score
 * 
 * @param {Object} players - Object of player objects keyed by ID
 * @returns {Array<{rank: number, id: string, name: string, score: number}>} - Sorted leaderboard
 */
export function generateLeaderboard(players) {
    // Convert players object to array
    const playerArray = Object.values(players);

    // Sort by score descending
    const sorted = playerArray.sort((a, b) => b.score - a.score);

    // Add ranks (handle ties)
    let currentRank = 1;
    return sorted.map((player, index) => {
        // Update rank only if score is different from previous player
        if (index > 0 && sorted[index - 1].score !== player.score) {
            currentRank = index + 1;
        }

        return {
            rank: currentRank,
            id: player.id,
            name: player.name,
            score: player.score
        };
    });
}

/**
 * Create a leaderboard snapshot with timestamp
 * 
 * @param {Object} players - Current players
 * @param {number} roundPair - The round pair number (1, 2, 3...)
 * @returns {Object} - Leaderboard snapshot
 */
export function createLeaderboardSnapshot(players, roundPair) {
    return {
        roundPair,
        timestamp: Date.now(),
        entries: generateLeaderboard(players)
    };
}

/**
 * Get the top N players from a leaderboard
 * 
 * @param {Array} leaderboard - The leaderboard entries
 * @param {number} n - Number of top players to return
 * @returns {Array} - Top N entries
 */
export function getTopPlayers(leaderboard, n) {
    return leaderboard.slice(0, n);
}

/**
 * Get player position in leaderboard
 * 
 * @param {Array} leaderboard - The leaderboard entries
 * @param {string} playerId - The player ID to find
 * @returns {number|null} - Player rank or null if not found
 */
export function getPlayerRank(leaderboard, playerId) {
    const entry = leaderboard.find(e => e.id === playerId);
    return entry ? entry.rank : null;
}

/**
 * Compare two leaderboards to find position changes
 * 
 * @param {Array} previousLeaderboard - Previous leaderboard
 * @param {Array} currentLeaderboard - Current leaderboard
 * @returns {Array<{id: string, name: string, previousRank: number, currentRank: number, change: number}>}
 */
export function getPositionChanges(previousLeaderboard, currentLeaderboard) {
    return currentLeaderboard.map(current => {
        const previous = previousLeaderboard.find(p => p.id === current.id);
        const previousRank = previous ? previous.rank : currentLeaderboard.length;

        return {
            id: current.id,
            name: current.name,
            previousRank,
            currentRank: current.rank,
            change: previousRank - current.rank // Positive = moved up
        };
    });
}
