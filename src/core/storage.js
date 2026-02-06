/**
 * Storage Engine - Handles localStorage persistence for game state
 */

const STORAGE_KEY = 'cseg_game_state';

/**
 * Save game state to localStorage
 * @param {Object} state - The current game state to save
 */
export function saveState(state) {
    try {
        const serialized = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
        console.error('Failed to save state to localStorage:', error);
    }
}

/**
 * Load game state from localStorage
 * @returns {Object|null} - The saved game state or null if none exists
 */
export function loadState() {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (serialized === null) {
            return null;
        }
        return JSON.parse(serialized);
    } catch (error) {
        console.error('Failed to load state from localStorage:', error);
        return null;
    }
}

/**
 * Clear saved game state from localStorage
 */
export function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear state from localStorage:', error);
    }
}

/**
 * Check if there is a saved game state
 * @returns {boolean} - True if saved state exists
 */
export function hasSavedState() {
    return localStorage.getItem(STORAGE_KEY) !== null;
}
