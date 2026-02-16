/**
 * Application Constants
 * centralized to prevent magic strings and typos.
 */

const MOVES = {
    ROCK: 'rock',
    PAPER: 'paper',
    SCISSORS: 'scissors'
};

const WINNER = {
    PLAYER: 'player',
    AI: 'ai',
    DRAW: 'draw'
};

const DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

const PERSONALITY = {
    FRIENDLY: 'Friendly',
    COMPETITIVE: 'Competitive',
    COACH: 'Coach'
};

module.exports = { MOVES, WINNER, DIFFICULTY, PERSONALITY };
