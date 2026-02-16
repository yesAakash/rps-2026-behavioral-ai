const { getRandomMove } = require('./game');

// Simple frequency analysis if AI fails
function deterministicFallback(history) {
  if (!history || history.length === 0) {
    return {
      predicted_player_move: 'rock',
      prediction_confidence: 33,
      player_style: 'random',
      explanation: "I don't have enough data yet, so I'm guessing.",
      coach_tip: "Start playing to build a pattern."
    };
  }

  const counts = { rock: 0, paper: 0, scissors: 0 };
  let lastMove = history[0].player;

  history.forEach(h => {
    if (counts[h.player] !== undefined) counts[h.player]++;
  });

  // Simple: Predict they will play what they play most often
  let predicted = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  
  return {
    predicted_player_move: predicted,
    prediction_confidence: 60,
    player_style: 'pattern',
    explanation: `You play ${predicted} frequently, so I adapted.`,
    coach_tip: "Try to vary your moves more."
  };
}

function summarizeHistory(history) {
  if (history.length === 0) return "No history.";
  const recent = history.slice(0, 10).map(h => `P:${h.player}/AI:${h.ai}`).join(", ");
  return `Last 10 rounds: ${recent}`;
}

module.exports = { deterministicFallback, summarizeHistory };
