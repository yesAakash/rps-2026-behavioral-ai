const assert = require('node:assert');
const test = require('node:test');
const { determineWinner, getCounterMove } = require('../server/src/game');
const { calculateDifficulty, shouldFollowPrediction } = require('../server/src/difficulty');

test('Game Logic: Winner determination', () => {
    assert.strictEqual(determineWinner('rock', 'scissors'), 'player');
    assert.strictEqual(determineWinner('rock', 'paper'), 'ai');
    assert.strictEqual(determineWinner('rock', 'rock'), 'draw');
    assert.strictEqual(determineWinner('scissors', 'paper'), 'player');
});

test('Game Logic: Counter moves', () => {
    assert.strictEqual(getCounterMove('rock'), 'paper');
    assert.strictEqual(getCounterMove('paper'), 'scissors');
    assert.strictEqual(getCounterMove('scissors'), 'rock');
});

test('Difficulty: Adaptive logic', () => {
    // Win streak >= 2 -> Hard
    assert.strictEqual(calculateDifficulty(2, 0), 'hard');
    assert.strictEqual(calculateDifficulty(5, 0), 'hard');
    
    // Lose streak >= 2 -> Easy
    assert.strictEqual(calculateDifficulty(0, 2), 'easy');
    assert.strictEqual(calculateDifficulty(0, 5), 'easy');
    
    // Mixed/Low -> Medium
    assert.strictEqual(calculateDifficulty(1, 0), 'medium');
    assert.strictEqual(calculateDifficulty(0, 1), 'medium');
    assert.strictEqual(calculateDifficulty(0, 0), 'medium');
});

test('Difficulty: Probability check', () => {
    // This is probabilistic, so we check that it returns a boolean
    const result = shouldFollowPrediction('hard');
    assert.ok(typeof result === 'boolean');
});
