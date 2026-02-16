const VALID_MOVES = ['rock', 'paper', 'scissors'];
const VALID_PERSONALITIES = ['Friendly', 'Competitive', 'Coach'];

function validatePlayRequest(body) {
  const { playerMove, history, stats, personality } = body;

  if (!playerMove || !VALID_MOVES.includes(playerMove)) {
    return { valid: false, error: 'Invalid or missing playerMove' };
  }

  if (!Array.isArray(history)) {
    return { valid: false, error: 'History must be an array' };
  }

  // Limit history size for safety/token usage
  if (history.length > 50) {
    return { valid: false, error: 'History array too large' };
  }

  if (!stats || typeof stats.wins !== 'number') {
    return { valid: false, error: 'Invalid stats object' };
  }

  if (!VALID_PERSONALITIES.includes(personality)) {
    return { valid: false, error: 'Invalid personality' };
  }

  return { valid: true };
}

module.exports = { validatePlayRequest, VALID_MOVES };
