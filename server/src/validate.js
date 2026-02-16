const { MOVES, PERSONALITY } = require('./constants');

const VALID_MOVES = Object.values(MOVES);
const VALID_PERSONALITIES = Object.values(PERSONALITY);

/**
 * Validates the incoming play request body.
 * @param {object} body 
 * @returns {object} { valid: boolean, error?: string }
 */
function validatePlayRequest(body) {
  const { playerMove, history, stats, personality } = body;

  if (!playerMove || !VALID_MOVES.includes(playerMove)) {
    return { valid: false, error: 'Invalid or missing playerMove' };
  }

  if (!Array.isArray(history)) {
    return { valid: false, error: 'History must be an array' };
  }

  // Security: Limit history size
  if (history.length > 50) {
    return { valid: false, error: 'History array too large' };
  }

  if (!stats || typeof stats.wins !== 'number') {
    return { valid: false, error: 'Invalid stats object' };
  }

  // Allow fallback if personality is missing/invalid, or enforce strictly?
  // Let's enforce strictly to ensure data quality.
  if (personality && !VALID_PERSONALITIES.includes(personality)) {
      return { valid: false, error: 'Invalid personality' };
  }

  return { valid: true };
}

module.exports = { validatePlayRequest };
