function calculateDifficulty(winStreak, loseStreak) {
  if (winStreak >= 2) return 'hard';
  if (loseStreak >= 2) return 'easy';
  return 'medium';
}

function shouldFollowPrediction(difficulty) {
  // Returns true if AI should use its prediction, false if it should randomize (make mistakes)
  const rand = Math.random();
  
  switch (difficulty) {
    case 'easy':
      return rand < 0.4; // 40% chance to play optimally
    case 'hard':
      return rand < 0.9; // 90% chance to play optimally
    case 'medium':
    default:
      return rand < 0.7; // 70% chance to play optimally
  }
}

module.exports = { calculateDifficulty, shouldFollowPrediction };
