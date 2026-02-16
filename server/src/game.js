function determineWinner(pMove, aiMove) {
  if (pMove === aiMove) return 'draw';
  if (
    (pMove === 'rock' && aiMove === 'scissors') ||
    (pMove === 'paper' && aiMove === 'rock') ||
    (pMove === 'scissors' && aiMove === 'paper')
  ) {
    return 'player';
  }
  return 'ai';
}

function getCounterMove(predictedMove) {
  const map = {
    'rock': 'paper',
    'paper': 'scissors',
    'scissors': 'rock'
  };
  return map[predictedMove] || 'rock';
}

function getRandomMove() {
  const moves = ['rock', 'paper', 'scissors'];
  return moves[Math.floor(Math.random() * moves.length)];
}

module.exports = { determineWinner, getCounterMove, getRandomMove };
