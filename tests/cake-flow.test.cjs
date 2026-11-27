const test = require('node:test');
const assert = require('node:assert/strict');
const { createBirthdayFlow } = require('../js/cake-flow.js');

test('candles cannot be blown before liking the cake', () => {
  const flow = createBirthdayFlow();
  assert.equal(flow.state, 'choosing');
  assert.equal(flow.blow(), false);
  assert.equal(flow.state, 'choosing');
});

test('disliking keeps the candle locked and allows a later like', () => {
  const flow = createBirthdayFlow();
  assert.equal(flow.dislike(), true);
  assert.equal(flow.blow(), false);
  assert.equal(flow.like(), true);
  assert.equal(flow.state, 'wishing');
});

test('liking unlocks one blow, repeated clicks cannot restart the transition', () => {
  const flow = createBirthdayFlow();
  assert.equal(flow.like(), true);
  assert.equal(flow.like(), false);
  assert.equal(flow.dislike(), false);
  assert.equal(flow.blow(), true);
  assert.equal(flow.state, 'celebrating');
  assert.equal(flow.blow(), false);
});
