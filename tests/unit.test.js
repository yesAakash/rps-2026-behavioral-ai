const { describe, it } = require('node:test');
const assert = require('node:assert');

const { determineWinner, getCounterMove } = require('../server/src/game');
const { calculateDifficulty } = require('../server/src/difficulty');
const { validatePlayRequest } = require('../server/src/validate');
const { parseGeminiJson } = require('../server/src/gemini');
const { deterministicFallback } = require('../server/src/behavior');
const { MOVES, WINNER, DIFFICULTY } = require('../server/src/constants');

describe('Core Game Logic', () => {
    it('should determine player wins (Rock vs Scissors)', () => {
        assert.strictEqual(determineWinner(MOVES.ROCK, MOVES.SCISSORS), WINNER.PLAYER);
    });

    it('should determine AI wins (Rock vs Paper)', () => {
        assert.strictEqual(determineWinner(MOVES.ROCK, MOVES.PAPER), WINNER.AI);
    });

    it('should determine draw (Same moves)', () => {
        assert.strictEqual(determineWinner(MOVES.ROCK, MOVES.ROCK), WINNER.DRAW);
    });

    it('should calculate correct counter move', () => {
        assert.strictEqual(getCounterMove(MOVES.ROCK), MOVES.PAPER);
        assert.strictEqual(getCounterMove(MOVES.PAPER), MOVES.SCISSORS);
    });
});

describe('Validation Logic', () => {
    it('should reject invalid moves', () => {
        const result = validatePlayRequest({ playerMove: 'lizard', history: [], stats: { wins: 0 } });
        assert.strictEqual(result.valid, false);
    });

    it('should reject missing history', () => {
        const result = validatePlayRequest({ playerMove: 'rock', stats: { wins: 0 } });
        assert.strictEqual(result.valid, false);
    });

    it('should accept valid payload', () => {
        const result = validatePlayRequest({ 
            playerMove: 'rock', 
            history: [], 
            stats: { wins: 0 },
            personality: 'Coach'
        });
        assert.strictEqual(result.valid, true);
    });
});

describe('Difficulty & Behavior', () => {
    it('should set HARD difficulty on win streak >= 2', () => {
        assert.strictEqual(calculateDifficulty(2, 0), DIFFICULTY.HARD);
        assert.strictEqual(calculateDifficulty(5, 0), DIFFICULTY.HARD);
    });

    it('should set EASY difficulty on lose streak >= 2', () => {
        assert.strictEqual(calculateDifficulty(0, 2), DIFFICULTY.EASY);
    });

    it('should default to MEDIUM', () => {
        assert.strictEqual(calculateDifficulty(0, 0), DIFFICULTY.MEDIUM);
    });
});

describe('Gemini Integration Safety', () => {
    it('should parse valid JSON from text', () => {
        const json = '{"predicted_player_move": "rock"}';
        const result = parseGeminiJson(json);
        assert.strictEqual(result.predicted_player_move, 'rock');
    });

    it('should handle Markdown code blocks in JSON', () => {
        const json = '```json\n{"predicted_player_move": "paper"}\n```';
        const result = parseGeminiJson(json);
        assert.strictEqual(result.predicted_player_move, 'paper');
    });

    it('should throw on invalid JSON', () => {
        assert.throws(() => parseGeminiJson('invalid json'));
    });

    it('fallback logic should return valid structure', () => {
        const result = deterministicFallback([]);
        assert.ok(result.predicted_player_move);
        assert.ok(result.explanation);
    });
});
