// Κανόνες κωδικού (lib/passRules.ts): ίδιοι με τη ρύθμιση της Supabase. Τρέχει με `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passOk, passProblem, strength } from '../lib/passRules.ts';

test('passOk: θέλει 8+, κεφαλαίο, μικρό, αριθμό, σύμβολο', () => {
  assert.equal(passOk('Kalimera1!'), true);
  assert.equal(passOk('kalimera1!'), false);
  assert.equal(passOk('KALIMERA1!'), false);
  assert.equal(passOk('Kalimera!!'), false);
  assert.equal(passOk('Kalimera11'), false);
  assert.equal(passOk('Ka1!'), false);
});

test('passProblem: το πρώτο πρόβλημα, ή null', () => {
  assert.match(passProblem('abc') ?? '', /^Ο κωδικός θέλει: τουλάχιστον 8/);
  assert.equal(passProblem('Kalimera1!', 'Kalimera1?'), 'Οι δύο κωδικοί δεν είναι ίδιοι');
  assert.equal(passProblem('Kalimera1!', 'Kalimera1!'), null);
  assert.equal(passProblem('Kalimera1!'), null);
});

test('strength: 0 κενό, 1 εύκολο, 4 μακρύ και πλήρες', () => {
  assert.equal(strength(''), 0);
  assert.equal(strength('Password1!'), 1, 'κοινό μοτίβο');
  assert.equal(strength('aaaaaaaa'), 1);
  assert.equal(strength('Kalimera1!'), 3);
  assert.equal(strength('Kalimera-Thessaloniki-7'), 4);
});
