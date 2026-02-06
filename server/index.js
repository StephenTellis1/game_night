/**
 * CSEG Game Server - Redesigned
 * 
 * Game Flow:
 * 1. RED Round: Each player gets a random unique snippet to bug
 * 2. BLUE Round: Bugged codes are shuffled - no player gets their own
 * 3. Next Round: New snippets assigned (excluding already used ones)
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// Game State
// ============================================

let gameState = {
    gameCode: null,
    hostId: null,
    players: {},           // { playerId: { id, name, score } }
    phase: 'IDLE',         // IDLE, LOBBY, RED, BLUE, LEADERBOARD, ENDED
    paused: false,
    currentRound: 1,

    // Snippet management
    snippetAssignments: {},  // RED: { playerId: snippetId }
    usedSnippetsByPlayer: {}, // { playerId: [snippetId1, snippetId2...] }

    // Current code state
    currentCode: {},         // { playerId: code } - player's current editing code
    originalCode: {},        // { playerId: code } - baseline (un-bugged) code

    // After RED submission
    buggedCodes: {},         // { playerId: { code, snippetId, bugCount } }

    // BLUE round assignments (who fixes whose code)
    blueAssignments: {},     // { playerId: introducerId }
    blueCurrentCode: {},     // { playerId: code } - what they're fixing

    // Tracking
    submissions: {},         // { playerId: true }
    bugResults: [],          // Array of bug fix results for scoring

    lastUpdate: Date.now()
};

// Config
const config = {
    roundPairs: 3,
    minBugs: 3,
    maxBugs: 5,
    points: {
        bugFixed: 3,
        bugSurvived: 2
    }
};

// Snippets (loaded from frontend)
let snippets = [];

// ============================================
// Helper Functions
// ============================================

// Check if a line is actual code (not a comment or empty)
function isCodeLine(line) {
    const trimmed = line.trim();
    // Empty line
    if (trimmed.length === 0) return false;
    // Single-line comment
    if (trimmed.startsWith('//')) return false;
    // Multi-line comment markers
    if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/')) return false;
    return true;
}

// Execute code against test cases safely
function executeCode(code, snippet) {
    if (!snippet) {
        return { success: false, error: 'No snippet provided', passedTests: 0, totalTests: 0 };
    }

    const results = [];
    let passedTests = 0;
    const testCases = snippet.testCases || [];

    // ==========================================
    // C / C++ Execution
    // ==========================================
    if (snippet.language === 'c' || snippet.language === 'cpp') {
        const id = Math.random().toString(36).substring(7);
        const ext = snippet.language === 'c' ? 'c' : 'cpp';
        const srcPath = path.resolve(`temp_${id}.${ext}`);
        const outPath = path.resolve(`temp_${id}.out`);
        const compiler = snippet.language === 'c' ? 'gcc' : 'g++';

        try {
            // Write source file
            fs.writeFileSync(srcPath, code);

            // Compile
            try {
                execSync(`${compiler} "${srcPath}" -o "${outPath}"`, { timeout: 5000, stdio: 'pipe' });
            } catch (compileError) {
                try { fs.unlinkSync(srcPath); } catch (e) { }
                return { success: false, error: 'Compilation Error: ' + compileError.stderr.toString() };
            }

            // Run against test cases
            for (const testCase of testCases) {
                try {
                    let inputStr = '';
                    if (testCase.input !== null && testCase.input !== undefined) {
                        if (Array.isArray(testCase.input)) {
                            inputStr = testCase.input.join('\n');
                        } else {
                            inputStr = String(testCase.input);
                        }
                    }

                    const output = execSync(`"${outPath}"`, {
                        input: inputStr,
                        timeout: 2000,
                        encoding: 'utf8'
                    });

                    // Compare Output
                    // For C, expected is usually string. Normalize newlines.
                    const actualTrimmed = output.trim().replace(/\r\n/g, '\n');
                    const expectedTrimmed = String(testCase.expected).trim().replace(/\r\n/g, '\n');

                    const passed = actualTrimmed === expectedTrimmed;
                    if (passed) passedTests++;

                    results.push({
                        input: testCase.input,
                        expected: testCase.expected,
                        actual: actualTrimmed,
                        passed
                    });

                } catch (runtimeError) {
                    results.push({
                        input: testCase.input,
                        expected: testCase.expected,
                        actual: null,
                        passed: false,
                        error: 'Runtime Error'
                    });
                }
            }

            // Cleanup
            try { fs.unlinkSync(srcPath); fs.unlinkSync(outPath); } catch (e) { }

            return { success: true, results, passedTests, totalTests: testCases.length };

        } catch (err) {
            // General error cleanup
            try { if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath); } catch (e) { }
            try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (e) { }
            return { success: false, error: 'Server Error: ' + err.message };
        }
    }

    // ==========================================
    // JavaScript Execution (Legacy / Fallback)
    // ==========================================
    if (!snippet.language || snippet.language === 'javascript') {
        if (!snippet.runner) return { success: false, error: 'No runner' };

        for (const testCase of testCases) {
            try {
                // Create a sandboxed function to run the code
                const fullCode = `
            ${code}
            const INPUT = ${JSON.stringify(testCase.input)};
            ${snippet.runner};
          `;

                // Use Function constructor for sandboxed execution
                const fn = new Function(fullCode);
                const output = fn();

                // Compare output with expected
                const passed = JSON.stringify(output) === JSON.stringify(testCase.expected);
                if (passed) passedTests++;

                results.push({
                    input: testCase.input,
                    expected: testCase.expected,
                    actual: output,
                    passed
                });
            } catch (error) {
                results.push({
                    input: testCase.input,
                    expected: testCase.expected,
                    actual: null,
                    passed: false,
                    error: error.message
                });
            }
        }
        return { success: true, results, passedTests, totalTests: testCases.length };
    }

    return { success: false, error: 'Unsupported language' };
}




function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generatePlayerId() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

function broadcastState() {
    gameState.lastUpdate = Date.now();
    broadcast({
        type: 'STATE_UPDATE',
        state: getClientState()
    });
}

// Get state safe for client (hide internal data)
function getClientState() {
    return {
        gameCode: gameState.gameCode,
        hostId: gameState.hostId,
        players: gameState.players,
        phase: gameState.phase,
        paused: gameState.paused,
        currentRound: gameState.currentRound,
        snippetAssignments: gameState.snippetAssignments,
        currentCode: gameState.currentCode,
        blueAssignments: gameState.blueAssignments,
        blueCurrentCode: gameState.blueCurrentCode,
        submissions: gameState.submissions,
        config,
        snippets,
        lastUpdate: gameState.lastUpdate
    };
}

// Shuffle array (Fisher-Yates)
function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Create derangement (no element stays in place) for shuffling bugged code
function derangement(items) {
    const n = items.length;
    if (n < 2) return items;

    let result;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        result = shuffle([...items]);
        attempts++;
        // Check if it's a valid derangement
        const isValid = items.every((item, i) => result[i] !== item);
        if (isValid) return result;
    } while (attempts < maxAttempts);

    // Fallback: manual derangement by rotating
    result = [...items.slice(1), items[0]];
    return result;
}

// Assign random snippets to players
// Rule: A player cannot bug the same snippet twice across rounds
// Multiple players CAN get the same snippet in one round
function assignSnippetsToPlayers() {
    const playerIds = Object.keys(gameState.players);
    const assignments = {};

    for (const playerId of playerIds) {
        // Get snippets this player hasn't used yet
        const usedByPlayer = gameState.usedSnippetsByPlayer[playerId] || [];
        const availableForPlayer = snippets.filter(s => !usedByPlayer.includes(s.id));

        if (availableForPlayer.length === 0) {
            // This player has used all snippets - game should end
            console.log(`Player ${playerId} has used all snippets`);
            continue;
        }

        // Pick a random snippet from available ones
        const randomIndex = Math.floor(Math.random() * availableForPlayer.length);
        const selectedSnippet = availableForPlayer[randomIndex];

        assignments[playerId] = selectedSnippet.id;

        // Track that this player used this snippet
        if (!gameState.usedSnippetsByPlayer[playerId]) {
            gameState.usedSnippetsByPlayer[playerId] = [];
        }
        gameState.usedSnippetsByPlayer[playerId].push(selectedSnippet.id);
    }

    return assignments;
}

// Get snippet by ID
function getSnippetById(id) {
    return snippets.find(s => s.id === id);
}

// ============================================
// REST API Endpoints
// ============================================

// Get current game state
app.get('/api/game', (req, res) => {
    res.json({
        success: true,
        state: getClientState()
    });
});

// Create new game (Host)
app.post('/api/game', (req, res) => {
    const { hostName } = req.body;

    if (!hostName || !hostName.trim()) {
        return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const gameCode = generateGameCode();
    const hostId = generatePlayerId();

    gameState = {
        gameCode,
        hostId,
        players: {
            [hostId]: { id: hostId, name: hostName.trim(), score: 0 }
        },
        phase: 'LOBBY',
        paused: false,
        currentRound: 1,
        snippetAssignments: {},
        usedSnippetsByPlayer: {},
        currentCode: {},
        originalCode: {},
        buggedCodes: {},
        blueAssignments: {},
        blueCurrentCode: {},
        submissions: {},
        bugResults: [],
        lastUpdate: Date.now()
    };

    broadcastState();

    res.json({
        success: true,
        playerId: hostId,
        gameCode,
        isHost: true
    });
});

// Join game
app.post('/api/game/join', (req, res) => {
    const { playerName, gameCode } = req.body;

    if (!playerName || !playerName.trim()) {
        return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (!gameState.gameCode) {
        return res.status(400).json({ success: false, message: 'No active game' });
    }

    if (gameCode && gameState.gameCode !== gameCode) {
        return res.status(400).json({ success: false, message: 'Invalid game code' });
    }

    if (gameState.phase !== 'LOBBY') {
        return res.status(400).json({ success: false, message: 'Game has already started' });
    }

    // Check for duplicate names
    const existingNames = Object.values(gameState.players).map(p => p.name.toLowerCase());
    if (existingNames.includes(playerName.trim().toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Name already taken' });
    }

    const playerId = generatePlayerId();
    gameState.players[playerId] = {
        id: playerId,
        name: playerName.trim(),
        score: 0
    };

    broadcastState();

    res.json({
        success: true,
        playerId,
        gameCode: gameState.gameCode,
        isHost: false
    });
});

// Game actions
app.post('/api/game/action', (req, res) => {
    const { action, playerId, data } = req.body;

    if (!playerId && action !== 'RESET') {
        return res.status(400).json({ success: false, message: 'Player ID required' });
    }

    const isHost = playerId === gameState.hostId;
    const player = gameState.players[playerId];

    let result = { success: true };

    switch (action) {
        case 'START_RED': {
            if (!isHost) {
                return res.status(403).json({ success: false, message: 'Only host can start' });
            }
            if (snippets.length === 0) {
                return res.status(400).json({ success: false, message: 'No snippets loaded' });
            }
            if (Object.keys(gameState.players).length < 2) {
                return res.status(400).json({ success: false, message: 'Need at least 2 players' });
            }

            // Assign random snippets to each player (excluding host)
            const playingPlayerIds = Object.keys(gameState.players).filter(id => id !== gameState.hostId);

            if (playingPlayerIds.length < 2) {
                return res.status(400).json({ success: false, message: 'Need at least 2 players (excluding host)' });
            }

            // Only assign to playing players
            const assignments = {};
            // Re-use logic for specific players
            for (const playerId of playingPlayerIds) {
                // Get snippets this player hasn't used yet
                const usedByPlayer = gameState.usedSnippetsByPlayer[playerId] || [];
                const availableForPlayer = snippets.filter(s => !usedByPlayer.includes(s.id));

                if (availableForPlayer.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableForPlayer.length);
                    const selectedSnippet = availableForPlayer[randomIndex];
                    assignments[playerId] = selectedSnippet.id;

                    if (!gameState.usedSnippetsByPlayer[playerId]) {
                        gameState.usedSnippetsByPlayer[playerId] = [];
                    }
                    gameState.usedSnippetsByPlayer[playerId].push(selectedSnippet.id);
                }
            }

            gameState.snippetAssignments = assignments;

            // Initialize each player's code with their assigned snippet
            Object.entries(assignments).forEach(([pid, snippetId]) => {
                const snippet = getSnippetById(snippetId);
                if (snippet) {
                    gameState.currentCode[pid] = snippet.code;
                    gameState.originalCode[pid] = snippet.code;
                }
            });

            gameState.phase = 'RED';
            gameState.submissions = {};
            gameState.buggedCodes = {};
            break;
        }

        case 'UPDATE_CODE': {
            if (gameState.paused) {
                return res.json({ success: false, message: 'Game paused' });
            }
            if (gameState.phase === 'RED') {
                gameState.currentCode[playerId] = data.code;
            } else if (gameState.phase === 'BLUE') {
                gameState.blueCurrentCode[playerId] = data.code;
            }
            break;
        }

            // Levenshtein distance for string comparison
            function levenshtein(a, b) {
                if (a.length === 0) return b.length;
                if (b.length === 0) return a.length;

                const matrix = [];

                // increment along the first column of each row
                for (let i = 0; i <= b.length; i++) {
                    matrix[i] = [i];
                }

                // increment each column in the first row
                for (let j = 0; j <= a.length; j++) {
                    matrix[0][j] = j;
                }

                // Fill in the rest of the matrix
                for (let i = 1; i <= b.length; i++) {
                    for (let j = 1; j <= a.length; j++) {
                        if (b.charAt(i - 1) === a.charAt(j - 1)) {
                            matrix[i][j] = matrix[i - 1][j - 1];
                        } else {
                            matrix[i][j] = Math.min(
                                matrix[i - 1][j - 1] + 1, // substitution
                                Math.min(
                                    matrix[i][j - 1] + 1, // insertion
                                    matrix[i - 1][j] + 1 // deletion
                                )
                            );
                        }
                    }
                }

                return matrix[b.length][a.length];
            }

        case 'SUBMIT_RED': {
            if (gameState.phase !== 'RED') {
                return res.status(400).json({ success: false, message: 'Not in RED round' });
            }
            if (gameState.submissions[playerId]) {
                return res.status(400).json({ success: false, message: 'Already submitted' });
            }

            const currentCode = gameState.currentCode[playerId] || '';
            const originalCode = gameState.originalCode[playerId] || '';

            // Count bug lines (lines that changed on actual code, not comments)
            const currentLines = currentCode.split('\n');
            const originalLines = originalCode.split('\n');
            let bugCount = 0;
            let commentOnlyChanges = 0;
            const bugLines = [];
            let significantChangeError = null;

            for (let i = 0; i < Math.max(currentLines.length, originalLines.length); i++) {
                const currentLine = currentLines[i] || '';
                const originalLine = originalLines[i] || '';

                if (currentLine !== originalLine) {
                    // Check if the original line is a code line (not comment/empty)
                    if (isCodeLine(originalLine)) {
                        bugCount++;
                        bugLines.push(i + 1);

                        // Anti-Trash Check: Significant Change
                        // Only check if both lines have decent length to avoid flagging small fixes
                        if (originalLine.length > 10 && currentLine.length > 10) {
                            const dist = levenshtein(originalLine, currentLine);
                            // If change is more than 60% of original length, it's too drastic (trash)
                            if (dist > originalLine.length * 0.6) {
                                significantChangeError = `Line ${i + 1} changed too significantly. Introduce subtle bugs!`;
                            }
                        }

                    } else {
                        commentOnlyChanges++;
                    }
                }
            }

            if (significantChangeError) {
                return res.status(400).json({ success: false, message: significantChangeError });
            }

            // Reject if only comments were changed
            if (bugCount === 0 && commentOnlyChanges > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'You can only modify actual code lines, not comments!'
                });
            }

            if (bugCount < config.minBugs || bugCount > config.maxBugs) {
                return res.status(400).json({
                    success: false,
                    message: `Must modify ${config.minBugs}-${config.maxBugs} code lines. You modified ${bugCount} code lines.`
                });
            }

            // Verify that the code is actually broken (Must-Break Rule)
            const snippetId = gameState.snippetAssignments[playerId];
            const snippet = getSnippetById(snippetId);

            // Execute the BUGGED code
            const buggedExecution = executeCode(currentCode, snippet);

            // If it passes ALL tests, it's not a bug!
            if (buggedExecution.success) {
                return res.status(400).json({
                    success: false,
                    message: `Your code still works! You must introduce a bug that causes at least one test failure.`
                });
            }

            // Store bugged code with snippet reference
            gameState.buggedCodes[playerId] = {
                code: currentCode,
                originalCode: originalCode,
                snippetId: snippetId,
                snippet: snippet, // Store full snippet for test case execution
                bugCount,
                bugLines,
                introducedBy: playerId
            };

            gameState.submissions[playerId] = true;
            result.bugCount = bugCount;
            break;
        }

        case 'START_BLUE': {
            if (!isHost) {
                return res.status(403).json({ success: false, message: 'Only host can start' });
            }

            // Get players who submitted (excluding host)
            const submittedPlayers = Object.keys(gameState.submissions)
                .filter(p => p !== gameState.hostId && gameState.submissions[p]);

            if (submittedPlayers.length < 2) {
                return res.status(400).json({ success: false, message: 'Need at least 2 players who submitted (excluding host)' });
            }

            // Create derangement - shuffle so no one gets their own code
            const shuffled = derangement(submittedPlayers);

            // Assign: player[i] fixes code from shuffled[i]
            gameState.blueAssignments = {};
            gameState.blueCurrentCode = {};

            submittedPlayers.forEach((fixerId, index) => {
                const introducerId = shuffled[index];
                gameState.blueAssignments[fixerId] = introducerId;

                // Give the fixer the bugged code from introducer
                if (gameState.buggedCodes[introducerId]) {
                    gameState.blueCurrentCode[fixerId] = gameState.buggedCodes[introducerId].code;
                }
            });

            gameState.phase = 'BLUE';
            gameState.submissions = {};
            break;
        }

        case 'SUBMIT_BLUE': {
            if (gameState.phase !== 'BLUE') {
                return res.status(400).json({ success: false, message: 'Not in BLUE round' });
            }
            if (gameState.submissions[playerId]) {
                return res.status(400).json({ success: false, message: 'Already submitted' });
            }

            // Get whose code this player was fixing
            const introducerId = gameState.blueAssignments[playerId];
            if (!introducerId || !gameState.buggedCodes[introducerId]) {
                return res.status(400).json({ success: false, message: 'No assignment found' });
            }

            const fixedCode = gameState.blueCurrentCode[playerId] || '';
            const buggedInfo = gameState.buggedCodes[introducerId];
            const snippet = buggedInfo.snippet;

            // Execute fixed code against test cases
            const fixedExecution = executeCode(fixedCode, snippet);

            // Execute original (correct) code against test cases for comparison
            const originalExecution = executeCode(buggedInfo.originalCode, snippet);

            // Calculate scores based on test execution
            const totalTests = fixedExecution.totalTests;
            const passedTests = fixedExecution.passedTests;
            const originalPassed = originalExecution.passedTests;

            // If fixer passes all tests, they get full points for "fixing"
            // If bugged code still fails some tests, introducer gets points
            const failedTests = totalTests - passedTests;

            // BONUS: 1 point for successful execution (no runtime errors)
            const executionBonus = fixedExecution.success ? 1 : 0;

            // Store results for scoring
            gameState.bugResults.push({
                fixerId: playerId,
                introducerId,
                totalTests,
                passedTests,
                failedTests,
                // Use passed tests as "fixed bugs" for scoring
                fixedBugs: passedTests,
                // Use failed tests as "bugs that survived"
                unfixedBugs: failedTests,
                executionBonus
            });

            gameState.submissions[playerId] = true;
            result.passedTests = passedTests;
            result.totalTests = totalTests;
            result.testResults = fixedExecution.results;
            result.executionBonus = executionBonus;
            break;
        }

        case 'END_ROUND': {
            if (!isHost) {
                return res.status(403).json({ success: false, message: 'Only host can end round' });
            }

            // Calculate scores from bug results
            gameState.bugResults.forEach(r => {
                // Fixer gets points for bugs fixed + execution bonus
                if (gameState.players[r.fixerId]) {
                    gameState.players[r.fixerId].score += (r.fixedBugs * config.points.bugFixed) + (r.executionBonus || 0);
                }
                // Introducer gets points for bugs that survived
                if (gameState.players[r.introducerId]) {
                    gameState.players[r.introducerId].score += r.unfixedBugs * config.points.bugSurvived;
                }
            });

            gameState.phase = 'VERIFY_SCORES';
            // Do NOT clear bugResults yet, host needs to see them
            break;
        }

        case 'UPDATE_SCORE': {
            if (!isHost) {
                return res.status(403).json({ success: false, message: 'Only host can update scores' });
            }
            const { targetPlayerId, newScore } = data;
            if (gameState.players[targetPlayerId]) {
                gameState.players[targetPlayerId].score = newScore;
            }
            break;
        }

        case 'CONFIRM_SCORES': {
            if (!isHost) {
                return res.status(403).json({ success: false, message: 'Only host can confirm scores' });
            }
            gameState.phase = 'LEADERBOARD';
            gameState.bugResults = []; // Clear results now
            break;
        }

        case 'NEXT_ROUND': {
            if (!isHost) {
                return res.status(403).json({ success: false, message: 'Only host can start next' });
            }

            // Check if any playing player (excluding host) has used all snippets (max rounds = number of snippets)
            const playingPlayerIds = Object.keys(gameState.players).filter(id => id !== gameState.hostId);
            const anyPlayerExhausted = playingPlayerIds.some(pid => {
                const used = gameState.usedSnippetsByPlayer[pid] || [];
                return used.length >= snippets.length;
            });

            if (anyPlayerExhausted) {
                gameState.phase = 'ENDED';
                result.ended = true;
                result.message = 'All snippets have been used';
            } else {
                gameState.currentRound++;
                // Reset for next round
                gameState.snippetAssignments = {};
                gameState.currentCode = {};
                gameState.originalCode = {};
                gameState.buggedCodes = {};
                gameState.blueAssignments = {};
                gameState.blueCurrentCode = {};
                gameState.submissions = {};
                result.readyForRed = true;
            }
            break;
        }

        case 'PAUSE': {
            if (!isHost) {
                return res.status(403).json({ success: false, message: 'Only host can pause' });
            }
            gameState.paused = !gameState.paused;
            break;
        }

        case 'END_GAME': {
            if (!isHost) {
                return res.status(403).json({ success: false, message: 'Only host can end' });
            }
            gameState.phase = 'ENDED';
            break;
        }

        case 'RESET': {
            gameState = {
                gameCode: null,
                hostId: null,
                players: {},
                phase: 'IDLE',
                paused: false,
                currentRound: 1,
                snippetAssignments: {},
                usedSnippetsByPlayer: {},
                currentCode: {},
                originalCode: {},
                buggedCodes: {},
                blueAssignments: {},
                blueCurrentCode: {},
                submissions: {},
                bugResults: [],
                lastUpdate: Date.now()
            };
            break;
        }

        case 'LEAVE': {
            if (gameState.players[playerId]) {
                delete gameState.players[playerId];
                delete gameState.currentCode[playerId];
                delete gameState.submissions[playerId];
            }
            break;
        }

        default:
            return res.status(400).json({ success: false, message: 'Unknown action' });
    }

    broadcastState();
    res.json(result);
});

// Load snippets
app.post('/api/snippets', (req, res) => {
    const { snippetsData } = req.body;

    if (Array.isArray(snippetsData)) {
        snippets = snippetsData;
        res.json({ success: true, count: snippets.length });
    } else {
        res.status(400).json({ success: false, message: 'Invalid snippets data' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', players: Object.keys(gameState.players).length });
});

// ============================================
// WebSocket
// ============================================

wss.on('connection', (ws) => {
    const clientId = generatePlayerId();
    console.log(`Client connected: ${clientId}`);

    // Send current state
    ws.send(JSON.stringify({
        type: 'CONNECTED',
        clientId,
        state: getClientState()
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'PING') {
                ws.send(JSON.stringify({ type: 'PONG' }));
            }
        } catch (e) {
            console.error('Invalid message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
    });
});

// ============================================
// Start Server
// ============================================

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════╗
║        CSEG Game Server Running                ║
╠════════════════════════════════════════════════╣
║  REST API:    http://localhost:${PORT}/api     ║
║  WebSocket:   ws://localhost:${PORT}           ║
╚════════════════════════════════════════════════╝

Server is listening on all interfaces (0.0.0.0)
Other devices on your LAN can connect using your IP address.
  `);
});
