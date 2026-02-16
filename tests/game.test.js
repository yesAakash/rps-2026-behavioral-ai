const assert = require('node:assert');
const test = require('node:test');
const { determineWinner, getCounterMove } = require('../server/src/game');

test('Winner Logic', () => {
    assert.strictEqual(determineWinner('rock', 'scissors'), 'player');
    assert.strictEqual(determineWinner('rock', 'paper'), 'ai');
    assert.strictEqual(determineWinner('rock', 'rock'), 'draw');
    assert.strictEqual(determineWinner('scissors', 'paper'), 'player');
});

test('Counter Logic', () => {
    assert.strictEqual(getCounterMove('rock'), 'paper');
    assert.strictEqual(getCounterMove('paper'), 'scissors');
    assert.strictEqual(getCounterMove('scissors'), 'rock');
});
