/**
 * Scoring Engine - Calculates player scores based on bug fixes
 */

/**
 * Calculate scores after BLUE round completion
 * Each fixed bug: +3 points to fixer
 * Each unfixed bug: +2 points to introducer
 * 
 * @param {Array} bugPool - Array of Bug objects
 * @param {Object} players - Object of player objects keyed by ID
 * @param {{bugFixed: number, bugNotFixed: number}} points - Points configuration
 * @returns {Object} - Updated players object with new scores
 */
export function calculateScores(bugPool, players, points) {
    // Create a copy of players to avoid mutation
    const updatedPlayers = JSON.parse(JSON.stringify(players));

    for (const bug of bugPool) {
        if (bug.status === 'FIXED') {
            // Bug was fixed: +bugFixed points to fixer
            if (bug.fixedBy && updatedPlayers[bug.fixedBy]) {
                updatedPlayers[bug.fixedBy].score += points.bugFixed;
            }
        } else {
            // Bug not fixed: +bugNotFixed points to introducer
            if (bug.introducedBy && updatedPlayers[bug.introducedBy]) {
                updatedPlayers[bug.introducedBy].score += points.bugNotFixed;
            }
        }
    }

    return updatedPlayers;
}

/**
 * Check if a bug has been fixed by comparing the current line to baseline
 * @param {string} currentLine - The current line content
 * @param {string} baselineLine - The original baseline line content
 * @returns {boolean} - True if the line matches baseline (bug is fixed)
 */
export function isBugFixed(currentLine, baselineLine) {
    return currentLine === baselineLine;
}

/**
 * Process bug fixes after BLUE round
 * Updates bug status and fixedBy fields based on code comparison
 * 
 * @param {Array} bugPool - Array of Bug objects
 * @param {string} currentCode - The current code after BLUE round
 * @param {string} baselineCode - The original baseline code
 * @param {string} fixerId - The ID of the player who submitted the fix
 * @returns {Array} - Updated bug pool with fix statuses
 */
export function processBugFixes(bugPool, currentCode, baselineCode, fixerId) {
    // Split code into lines for comparison
    const currentLines = currentCode.split(/\r?\n/);
    const baselineLines = baselineCode.split(/\r?\n/);

    return bugPool.map(bug => {
        const lineIndex = bug.bugLine - 1; // Convert to 0-indexed
        const currentLine = currentLines[lineIndex] !== undefined ? currentLines[lineIndex] : '';
        const baselineLine = baselineLines[lineIndex] !== undefined ? baselineLines[lineIndex] : '';

        if (isBugFixed(currentLine, baselineLine)) {
            return {
                ...bug,
                status: 'FIXED',
                fixedBy: fixerId
            };
        }

        return bug;
    });
}

/**
 * Get score summary for a player
 * @param {string} playerId - The player ID
 * @param {Array} bugPool - Array of Bug objects
 * @param {{bugFixed: number, bugNotFixed: number}} points - Points configuration
 * @returns {{fixed: number, unfixed: number, pointsFromFixes: number, pointsFromUnfixed: number, total: number}}
 */
export function getPlayerScoreSummary(playerId, bugPool, points) {
    const bugsIntroduced = bugPool.filter(b => b.introducedBy === playerId);
    const bugsFixed = bugPool.filter(b => b.fixedBy === playerId);

    const unfixedBugs = bugsIntroduced.filter(b => b.status !== 'FIXED').length;
    const fixedCount = bugsFixed.length;

    const pointsFromFixes = fixedCount * points.bugFixed;
    const pointsFromUnfixed = unfixedBugs * points.bugNotFixed;

    return {
        fixed: fixedCount,
        unfixed: unfixedBugs,
        pointsFromFixes,
        pointsFromUnfixed,
        total: pointsFromFixes + pointsFromUnfixed
    };
}
