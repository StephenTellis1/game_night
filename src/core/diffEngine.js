/**
 * Diff Engine - Compares code line-by-line to detect changes
 */

/**
 * Split code into lines, handling different line ending styles
 * @param {string} code - The code to split
 * @returns {string[]} - Array of lines
 */
export function splitLines(code) {
    if (!code) return [];
    return code.split(/\r?\n/);
}

/**
 * Compare two versions of code and return the differences
 * @param {string} oldCode - The original code (baseline)
 * @param {string} newCode - The modified code
 * @returns {Array<{line: number, before: string, after: string}>} - Array of diff objects
 */
export function diffLines(oldCode, newCode) {
    const oldLines = splitLines(oldCode);
    const newLines = splitLines(newCode);

    const diffs = [];
    const maxLength = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLength; i++) {
        const before = oldLines[i] !== undefined ? oldLines[i] : '';
        const after = newLines[i] !== undefined ? newLines[i] : '';

        // Only record lines that are different
        if (before !== after) {
            diffs.push({
                line: i + 1, // 1-indexed line numbers
                before,
                after
            });
        }
    }

    return diffs;
}

/**
 * Check if a specific line has been changed
 * @param {string} oldCode - The original code
 * @param {string} newCode - The modified code
 * @param {number} lineNumber - 1-indexed line number to check
 * @returns {boolean} - True if line has changed
 */
export function hasLineChanged(oldCode, newCode, lineNumber) {
    const oldLines = splitLines(oldCode);
    const newLines = splitLines(newCode);

    const index = lineNumber - 1; // Convert to 0-indexed
    const oldLine = oldLines[index] !== undefined ? oldLines[index] : '';
    const newLine = newLines[index] !== undefined ? newLines[index] : '';

    return oldLine !== newLine;
}

/**
 * Get a specific line from code
 * @param {string} code - The code
 * @param {number} lineNumber - 1-indexed line number
 * @returns {string} - The line content or empty string
 */
export function getLine(code, lineNumber) {
    const lines = splitLines(code);
    const index = lineNumber - 1;
    return lines[index] !== undefined ? lines[index] : '';
}

/**
 * Replace a specific line in code
 * @param {string} code - The original code
 * @param {number} lineNumber - 1-indexed line number to replace
 * @param {string} newContent - The new line content
 * @returns {string} - The updated code
 */
export function replaceLine(code, lineNumber, newContent) {
    const lines = splitLines(code);
    const index = lineNumber - 1;

    if (index >= 0 && index < lines.length) {
        lines[index] = newContent;
    }

    return lines.join('\n');
}
