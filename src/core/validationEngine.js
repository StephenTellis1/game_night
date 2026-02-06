/**
 * Validation Engine - Validates submissions, player names, and bug counts
 */

/**
 * Validate that bug count is within allowed limits
 * @param {Array} diffs - Array of diff objects
 * @param {number} minBugs - Minimum number of bugs required
 * @param {number} maxBugs - Maximum number of bugs allowed
 * @returns {{valid: boolean, message: string}} - Validation result
 */
export function validateBugCount(diffs, minBugs, maxBugs) {
    const count = diffs.length;

    if (count < minBugs) {
        return {
            valid: false,
            message: `You must introduce at least ${minBugs} bugs. You only changed ${count} line(s).`
        };
    }

    if (count > maxBugs) {
        return {
            valid: false,
            message: `You can introduce at most ${maxBugs} bugs. You changed ${count} line(s).`
        };
    }

    return {
        valid: true,
        message: `Valid submission with ${count} bug(s).`
    };
}

/**
 * Validate that code is not empty
 * @param {string} code - The code to validate
 * @returns {{valid: boolean, message: string}} - Validation result
 */
export function validateNotEmpty(code) {
    if (!code || code.trim() === '') {
        return {
            valid: false,
            message: 'Submission cannot be empty.'
        };
    }

    return {
        valid: true,
        message: 'Submission is not empty.'
    };
}

/**
 * Validate player name is unique and not empty
 * @param {string} name - The player name to validate
 * @param {Object} existingPlayers - Object of existing players keyed by ID
 * @returns {{valid: boolean, message: string}} - Validation result
 */
export function validatePlayerName(name, existingPlayers) {
    // Check for empty name
    if (!name || name.trim() === '') {
        return {
            valid: false,
            message: 'Name cannot be empty.'
        };
    }

    const trimmedName = name.trim();

    // Check for minimum length
    if (trimmedName.length < 2) {
        return {
            valid: false,
            message: 'Name must be at least 2 characters.'
        };
    }

    // Check for maximum length
    if (trimmedName.length > 20) {
        return {
            valid: false,
            message: 'Name cannot exceed 20 characters.'
        };
    }

    // Check for duplicate names
    const existingNames = Object.values(existingPlayers).map(p => p.name.toLowerCase());
    if (existingNames.includes(trimmedName.toLowerCase())) {
        return {
            valid: false,
            message: 'A player with this name already exists.'
        };
    }

    return {
        valid: true,
        message: 'Valid name.'
    };
}

/**
 * Validate that a line edit is allowed in BLUE round (only buggy lines)
 * @param {number} lineNumber - The line being edited (1-indexed)
 * @param {Array} buggyLines - Array of line numbers that have bugs
 * @returns {{valid: boolean, message: string}} - Validation result
 */
export function validateBlueRoundEdit(lineNumber, buggyLines) {
    if (!buggyLines.includes(lineNumber)) {
        return {
            valid: false,
            message: '🔵 You can only edit lines that contain bugs.'
        };
    }

    return {
        valid: true,
        message: 'Edit allowed.'
    };
}

/**
 * Validate that the game has required snippets
 * @param {Array} snippets - Array of snippet objects
 * @returns {{valid: boolean, message: string}} - Validation result
 */
export function validateSnippetsLoaded(snippets) {
    if (!snippets || snippets.length === 0) {
        return {
            valid: false,
            message: 'No code snippets available. Please check snippets.json file.'
        };
    }

    return {
        valid: true,
        message: `${snippets.length} snippet(s) loaded.`
    };
}
