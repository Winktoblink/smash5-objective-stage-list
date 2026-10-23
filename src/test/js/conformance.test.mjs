import assert from 'node:assert/strict';
import { test } from 'node:test';
import { search } from '../../main/resources/static/js/criteria.js';
import { conformance, stages } from './support.mjs';

// The same cases run against the real API in StageConformanceSpec. If the two implementations ever
// disagree, one of the two test suites fails.
for (const { name, request, expected, expectedCount } of conformance) {
  test(`conformance: ${name}`, () => {
    const names = search(stages, request).map((s) => s.name);
    if (expected) assert.deepEqual([...names].sort(), [...expected].sort());
    if (expectedCount !== undefined) assert.equal(names.length, expectedCount);
  });
}
