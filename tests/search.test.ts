// Αναζήτηση καταστημάτων (lib/client/search.ts). Τρέχει με `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catsFor, plain, searchFilters } from '../lib/client/search.ts';

test('plain: χωρίς τόνους, πεζά, τελικό σ', () => {
  assert.equal(plain('Κομμωτήριο Μαρίας'), 'κομμωτηριο μαριασ');
  assert.equal(plain('ΦΥΣΙΚΟΘΕΡΑΠΕΊΑ'), 'φυσικοθεραπεια');
});

test('catsFor: λέξεις → είδη', () => {
  assert.deepEqual(catsFor('κουρείο'), ['barber']);
  assert.deepEqual(catsFor('νύχια'), ['nails']);
  assert.deepEqual(catsFor('pilates'), ['pilates_yoga']);
  assert.ok(catsFor('κομμωτήριο').includes('hair'));
  assert.deepEqual(catsFor('ab'), [], 'κάτω από 3 γράμματα: τίποτα');
  assert.deepEqual(catsFor('θεσσαλονίκη'), []);
});

test('searchFilters: ένα φίλτρο ανά λέξη, με το είδος όταν ταιριάζει', () => {
  const f = searchFilters('κουρείο  Πάτρα');
  assert.equal(f.length, 2);
  assert.match(f[0], /name\.ilike\.%κουρείο%/);
  assert.match(f[0], /category\.in\.\(barber\)/);
  assert.match(f[1], /city\.ilike\.%Πάτρα%/);
  assert.doesNotMatch(f[1], /category/);
});

test('searchFilters: καθαρίζει χαρακτήρες που σπάνε το φίλτρο της Supabase', () => {
  const f = searchFilters('a,b (c)*%');
  assert.ok(f.every((x) => !/[()*%,]{2}/.test(x.replace(/%[^%,]*%/g, ''))));
  assert.deepEqual(searchFilters('   '), []);
});
