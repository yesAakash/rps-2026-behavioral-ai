const { MOVES } = require('./constants');

/**
 * Fallback logic when AI fails or is unavailable.
 * Uses simple frequency analysis.
 * @param {Array} history 
 * @returns {object} AI Decision Object
 */
function deterministicFallback(history) {
  if (!history || history.length === 0) {
    return {
      predicted_player_move: MOVES.ROCK,
      prediction_confidence: 30,
      player_style: 'random',
      explanation: "I'm still learning your patterns.",
      coach_tip: "Play a few more rounds!"
    };
  }

  // Count frequencies
  const counts = { [MOVES.ROCK]: 0, [MOVES.PAPER]: 0, [MOVES.SCISSORS]: 0 };
  history.forEach(h => {
    if (counts[h.player] !== undefined) counts[h.player]++;
  });

  // Find most frequent move
  let predicted = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  
  return {
    predicted_player_move: predicted,
    prediction_confidence: 60,
    player_style: 'pattern',
    explanation: `You seem to favor ${predicted}.`,
    coach_tip: "Try mixing up your moves."
  };
}

function summarizeHistory(history) {
  if (!history || history.length === 0) return "No history.";
  const recent = history.slice(0, 10).map(h => `P:${h.player}/AI:${h.ai}`).join(", ");
  return `Last 10: ${recent}`;
}

module.exports = { deterministicFallback, summarizeHistory };
