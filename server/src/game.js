const { MOVES, WINNER } = require('./constants');

/**
 * Determines the winner of a round.
 * @param {string} pMove - Player's move
 * @param {string} aiMove - AI's move
 * @returns {string} - 'player', 'ai', or 'draw'
 */
function determineWinner(pMove, aiMove) {
  if (pMove === aiMove) return WINNER.DRAW;
  if (
    (pMove === MOVES.ROCK && aiMove === MOVES.SCISSORS) ||
    (pMove === MOVES.PAPER && aiMove === MOVES.ROCK) ||
    (pMove === MOVES.SCISSORS && aiMove === MOVES.PAPER)
  ) {
    return WINNER.PLAYER;
  }
  return WINNER.AI;
}

/**
 * Returns the winning move against the input.
 * @param {string} move 
 * @returns {string}
 */
function getCounterMove(move) {
  const map = {
    [MOVES.ROCK]: MOVES.PAPER,
    [MOVES.PAPER]: MOVES.SCISSORS,
    [MOVES.SCISSORS]: MOVES.ROCK
  };
  return map[move] || MOVES.ROCK;
}

/**
 * Returns a random valid move.
 * @returns {string}
 */
function getRandomMove() {
  const moves = Object.values(MOVES);
  return moves[Math.floor(Math.random() * moves.length)];
}

module.exports = { determineWinner, getCounterMove, getRandomMove };
