const assert = require('node:assert');
const test = require('node:test');
const { validatePlayRequest } = require('../server/src/validate');

test('Validation Logic', () => {
    const validBody = {
        playerMove: 'rock',
        history: [],
        stats: { wins: 0, losses: 0 },
        personality: 'Friendly'
    };
    
    assert.strictEqual(validatePlayRequest(validBody).valid, true);

    const invalidMove = { ...validBody, playerMove: 'lizard' };
    assert.strictEqual(validatePlayRequest(invalidMove).valid, false);

    const invalidHistory = { ...validBody, history: 'not-array' };
    assert.strictEqual(validatePlayRequest(invalidHistory).valid, false);
});
