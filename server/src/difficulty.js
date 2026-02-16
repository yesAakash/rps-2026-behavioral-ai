const { DIFFICULTY } = require('./constants');

/**
 * Calculates difficulty based on streaks.
 * @param {number} winStreak 
 * @param {number} loseStreak 
 * @returns {string} 'easy' | 'medium' | 'hard'
 */
function calculateDifficulty(winStreak, loseStreak) {
  if (winStreak >= 2) return DIFFICULTY.HARD;
  if (loseStreak >= 2) return DIFFICULTY.EASY;
  return DIFFICULTY.MEDIUM;
}

/**
 * Determines if AI should use its prediction logic based on difficulty.
 * @param {string} difficulty 
 * @returns {boolean}
 */
function shouldFollowPrediction(difficulty) {
  const rand = Math.random();
  
  switch (difficulty) {
    case DIFFICULTY.EASY:
      return rand < 0.4; // 40% optimal
    case DIFFICULTY.HARD:
      return rand < 0.9; // 90% optimal
    case DIFFICULTY.MEDIUM:
    default:
      return rand < 0.7; // 70% optimal
  }
}

module.exports = { calculateDifficulty, shouldFollowPrediction };
