import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extents, stageDiagram } from '../../main/resources/static/js/diagram.js';
import { byName, stages } from './support.mjs';

test('extents give the nearest and furthest blast zones', () => {
  const { near, far } = extents(byName('Delfino Plaza'));
  assert.equal(near.left, -180);
  assert.equal(far.left, -230);
});

test('a diagram has the blast zones, the stage, ledges and the Battlefield overlay', () => {
  const svg = stageDiagram(byName('Smashville'), byName('Battlefield'));
  assert.match(svg, /^<svg class="diagram"/);
  assert.match(svg, /dg-far/);
  assert.match(svg, /dg-stage/);
  assert.match(svg, /dg-ledge/);
  assert.match(svg, /dg-ref/);
});

test('Battlefield is not overlaid on itself', () => {
  const battlefield = byName('Battlefield');
  assert.doesNotMatch(stageDiagram(battlefield, battlefield), /dg-ref/);
});

test('a moving stage shows both the nearest and furthest blast zones', () => {
  assert.match(stageDiagram(byName('Delfino Plaza'), null), /dg-near/);
});

test('stages with no ledges draw no ledge markers', () => {
  const stage = stages.find((s) => s.ledgeCount.max === 0);
  assert.doesNotMatch(stageDiagram(stage, null), /dg-ledge/);
});

test('names are escaped and the label is optional', () => {
  const stage = { ...byName('Battlefield'), name: 'A <b> & "c"' };
  const svg = stageDiagram(stage, null, { label: true });
  assert.ok(!svg.includes('<b>'));
  assert.match(svg, /A &lt;b&gt; &amp; &quot;c&quot;/);
  assert.match(svg, /dg-label/);
  assert.doesNotMatch(stageDiagram(stage, null), /dg-label/);
});

test('every stage produces a diagram with finite numbers', () => {
  for (const stage of stages) {
    const svg = stageDiagram(stage, byName('Battlefield'));
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/, stage.name);
  }
});
