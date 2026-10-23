// DOM wiring only. The rules live in criteria.js, the wording in explain.js and the pictures in diagram.js.
// Every URL is relative so the page works wherever it is hosted (for example under /repo-name/ on GitHub Pages).

import {
  FEATURES, RANGE_MATCH, WIDTH, classify, isEmpty, signedToDistanceRange, toCriteria,
} from './criteria.js';
import { describeMode, explainFailure, formatRange, measurementRows, summaryLine } from './explain.js';
import { stageDiagram } from './diagram.js';
import { CRITERIA_PRESETS } from './presets.js';

const DATA_URL = 'data/stages.json';
const DEBOUNCE_MS = 120;

const $ = (id) => document.getElementById(id);
const form = $('search-form');

/** The measurement rows of the form. `ref` reads the same measurement from a reference stage, in plain terms. */
const MEASUREMENTS = [
  { key: 'sides', label: 'Side blast zones', help: 'Left and right together, as a distance from the center.', ref: (s) => signedToDistanceRange('left', s.blastZones.left), fill: true, group: 'together' },
  { key: 'left', label: 'Left blast zone', help: 'Distance from the center to the left blast zone.', ref: (s) => signedToDistanceRange('left', s.blastZones.left), fill: true, group: 'separate' },
  { key: 'right', label: 'Right blast zone', help: 'Distance from the center to the right blast zone.', ref: (s) => signedToDistanceRange('right', s.blastZones.right), fill: true, group: 'separate' },
  { key: 'top', label: 'Top blast zone', help: 'Distance from the center up to the top blast zone.', ref: (s) => signedToDistanceRange('top', s.blastZones.top), fill: true },
  { key: 'bottom', label: 'Bottom blast zone', help: 'Distance from the center down to the bottom blast zone.', ref: (s) => signedToDistanceRange('bottom', s.blastZones.bottom), fill: true },
  { key: WIDTH.key, label: WIDTH.label, help: 'Width of the main stage platform.', ref: (s) => ({ min: s.stageWidth, max: s.stageWidth }), fill: true },
  { key: 'distanceToBlastZone', label: 'Distance from ledge to side blast zone', help: 'From the edge of the stage to the nearest side blast zone. 0 on walk-off stages.', ref: (s) => s.distanceToBlastZone, fill: true },
  { key: 'ledgeCount', label: 'Ledges', help: 'How many ledges a fighter can grab.', ref: (s) => s.ledgeCount, integer: true },
];

let stages = [];
let references = [];
let timer;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

// ---------- the form ----------

function buildForm() {
  const ranges = $('ranges');
  for (const m of MEASUREMENTS) {
    const attrs = { type: 'number', step: m.integer ? '1' : 'any', inputmode: 'decimal' };
    const min = el('input', { ...attrs, name: `${m.key}.min`, 'aria-label': `${m.label} minimum`, placeholder: 'min' });
    const max = el('input', { ...attrs, name: `${m.key}.max`, 'aria-label': `${m.label} maximum`, placeholder: 'max' });
    const row = el('div', { class: 'range', 'data-key': m.key, title: m.help },
      el('span', { class: 'name' }, m.label), el('div', { class: 'pair' }, min, max),
      el('span', { class: 'ref', 'data-ref': m.key }));
    if (m.fill) {
      row.append(el('button', { type: 'button', class: 'fill', 'data-fill': m.key },
        'Within ±10% of Battlefield'));
    }
    if (m.key === 'sides') {
      row.append(el('label', { class: 'toggle' },
        el('input', { type: 'checkbox', name: 'separateSides' }), 'Each side separately'));
    }
    if (m.group) row.dataset.group = m.group;
    ranges.append(row);
  }

  for (const f of FEATURES) {
    const id = `f-${f.key}`;
    const select = el('select', { id, name: `features.${f.key}`, title: f.help ?? 'Definition to be confirmed.' },
      el('option', { value: '' }, 'Any'), el('option', { value: 'true' }, 'Yes'), el('option', { value: 'false' }, 'No'));
    $('features').append(el('div', {}, el('label', { for: id, title: f.help ?? 'Definition to be confirmed.' }, f.label), select));
  }

  const glossary = $('glossary');
  for (const m of MEASUREMENTS.filter((x) => x.group !== 'separate')) {
    glossary.append(el('dt', {}, m.label), el('dd', {}, m.help));
  }
  glossary.append(
    el('dt', {}, 'At all times / at some point'),
    el('dd', {}, 'Some stages move or change during a match, so a measurement can be a range. "At all times" needs the whole range to be inside what you asked for. "At some point" only needs it to reach what you asked for.'));
  for (const f of FEATURES) {
    glossary.append(el('dt', {}, f.label), el('dd', {}, f.help ?? 'Definition to be confirmed.'));
  }
  syncSides();
}

function syncSides() {
  const separate = form.elements.separateSides.checked;
  for (const row of form.querySelectorAll('.range[data-group]')) {
    row.hidden = (row.dataset.group === 'separate') !== separate;
  }
}

const number = (input) => (input.value.trim() === '' ? null : Number(input.value));

/** The form as plain-terms state (see toCriteria). */
function readPlain() {
  const plain = { features: {}, separateSides: form.elements.separateSides.checked };
  for (const m of MEASUREMENTS) {
    plain[m.key] = {
      min: number(form.elements[`${m.key}.min`]),
      max: number(form.elements[`${m.key}.max`]),
    };
  }
  for (const f of FEATURES) {
    const value = form.elements[`features.${f.key}`].value;
    if (value !== '') plain.features[f.key] = value === 'true';
  }
  plain.rangeMatch = form.elements.rangeMatch.value;
  return plain;
}

function fillForm(plain = {}) {
  form.reset();
  for (const m of MEASUREMENTS) {
    form.elements[`${m.key}.min`].value = plain[m.key]?.min ?? '';
    form.elements[`${m.key}.max`].value = plain[m.key]?.max ?? '';
  }
  for (const f of FEATURES) {
    const value = plain.features?.[f.key];
    form.elements[`features.${f.key}`].value = value === undefined ? '' : String(value);
  }
  syncSides();
}

/** Ranges whose minimum is above their maximum, among the rows that are visible. */
function invalidRanges(plain) {
  return MEASUREMENTS.filter((m) => {
    const visible = !form.querySelector(`.range[data-key="${m.key}"]`).hidden;
    const { min, max } = plain[m.key];
    return visible && min !== null && max !== null && min > max;
  });
}

// ---------- reference points ----------

function showReferences() {
  for (const m of MEASUREMENTS) {
    const parts = references.map((s) => `${s.name} ${formatRange(m.ref(s).min, m.ref(s).max)}`);
    form.querySelector(`[data-ref="${m.key}"]`).textContent = parts.join(' · ');
  }
}

/** A range within 10% of Battlefield's value, rounded outwards to whole numbers. */
function fillWithinTenPercent(key) {
  const m = MEASUREMENTS.find((x) => x.key === key);
  const battlefield = references[0];
  if (!m || !battlefield) return;
  const r = m.ref(battlefield);
  form.elements[`${key}.min`].value = Math.floor(r.min * 0.9);
  form.elements[`${key}.max`].value = Math.ceil(r.max * 1.1);
  refresh();
}

// ---------- results ----------

function stageCard(entry, mode) {
  const { stage, failures } = entry;
  const name = el('button', { type: 'button', class: 'name', 'data-stage': stage.id }, stage.name);
  const why = failures.length
    ? el('ul', { class: 'why' }, ...failures.map((f) => el('li', {}, explainFailure(f, mode))))
    : el('ul', { class: 'why ok' }, el('li', {}, 'Meets every criterion.'));
  const picture = el('div', { class: 'picture' });
  picture.innerHTML = stageDiagram(stage, references[0] ?? null);
  return el('li', { class: 'stage' }, picture,
    el('div', {}, name, el('p', { class: 'numbers' }, summaryLine(stage)), why));
}

function group(title, entries, mode, { open = true, intro = '' } = {}) {
  const details = el('details', { class: 'group' }, el('summary', {}, `${title} (${entries.length})`));
  details.open = open;
  if (intro) details.append(el('p', { class: 'hint' }, intro));
  details.append(el('ul', { class: 'stage-list' }, ...entries.map((e) => stageCard(e, mode))));
  return details;
}

function setStatus(text, isError = false) {
  const status = $('status');
  status.textContent = text;
  status.classList.toggle('error', isError);
}

function refresh() {
  const plain = readPlain();
  $('mode-note').textContent = describeMode(plain.rangeMatch);
  syncSides();

  const problems = invalidRanges(plain);
  for (const row of form.querySelectorAll('.range')) {
    row.classList.toggle('invalid', problems.some((m) => m.key === row.dataset.key));
  }
  const errors = $('errors');
  errors.replaceChildren(...problems.map((m) => el('li', {}, `${m.label}: the minimum is above the maximum.`)));
  errors.hidden = problems.length === 0;
  if (problems.length) {
    $('groups').replaceChildren();
    setStatus('Fix the highlighted ranges to see results.', true);
    return;
  }

  const criteria = toCriteria(plain);
  const { matches, nearMisses, excluded } = classify(stages, criteria);
  const mode = criteria.rangeMatch ?? RANGE_MATCH.CONTAINED;
  const total = matches.length;
  setStatus(isEmpty(criteria)
    ? `Showing all ${stages.length} stages. Set a criterion to narrow them down.`
    : `${total} ${total === 1 ? 'stage matches' : 'stages match'} out of ${stages.length}.`);

  const groups = [group('Matches', matches, mode)];
  if (nearMisses.length) {
    groups.push(group('Near misses', nearMisses, mode, { open: true, intro: 'These fail exactly one criterion.' }));
  }
  if (excluded.length) {
    groups.push(group('Excluded', excluded, mode, { open: false, intro: 'These fail two or more criteria.' }));
  }
  $('groups').replaceChildren(...groups);
}

// ---------- detail view ----------

function openDetail(id) {
  const stage = stages.find((s) => s.id === id);
  if (!stage) return;
  const criteria = toCriteria(readPlain());
  const entry = [...Object.values(classify([stage], criteria))].flat()[0];
  const table = el('table', {}, el('tbody', {},
    ...measurementRows(stage).map(([k, v]) => el('tr', {}, el('th', { scope: 'row' }, k), el('td', {}, v)))));
  const flags = FEATURES.map((f) => `${f.label}: ${stage.features[f.key] ? 'Yes' : 'No'}`).join(' · ');
  const why = entry.failures.length
    ? el('ul', { class: 'why' }, ...entry.failures.map((f) => el('li', {}, explainFailure(f, criteria.rangeMatch))))
    : el('p', {}, 'Meets every criterion.');
  const picture = el('div');
  picture.innerHTML = stageDiagram(stage, references[0] ?? null, { label: true });
  $('detail-title').textContent = stage.name;
  $('detail-body').replaceChildren(picture,
    el('p', { class: 'legend' }, 'Solid box: the nearest the blast zones get. Dashed grey box: the furthest. Green dashed: Battlefield. Red dots: ledges. Platforms are not drawn.'),
    table, el('p', {}, flags), why);
  $('detail').showModal();
}

// ---------- start ----------

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(refresh, DEBOUNCE_MS);
}

/** On GitHub Pages there is no API, so Swagger UI doesn't exist: point to the README's API section instead. */
function fixSwaggerLink() {
  if (!location.hostname.endsWith('github.io')) return;
  const link = $('swagger-link');
  link.href = 'https://github.com/Winktoblink/smash5-objective-stage-list#api';
  link.textContent = 'API (run it locally)';
}

async function init() {
  buildForm();
  fixSwaggerLink();
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    stages = await response.json();
  } catch (err) {
    setStatus(`Could not load the stage list (${err.message}). If you opened this file directly, serve the folder over HTTP instead.`, true);
    return;
  }
  references = ['Battlefield', 'Final Destination'].map((name) => stages.find((s) => s.name === name)).filter(Boolean);
  showReferences();

  form.addEventListener('input', schedule);
  form.addEventListener('reset', () => setTimeout(() => { syncSides(); refresh(); }));
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('click', (event) => {
    const fill = event.target.closest('[data-fill]');
    if (fill) fillWithinTenPercent(fill.dataset.fill);
  });
  $('preset').addEventListener('click', () => {
    fillForm(CRITERIA_PRESETS[0].plain);
    refresh();
  });
  $('groups').addEventListener('click', (event) => {
    const button = event.target.closest('[data-stage]');
    if (button) openDetail(Number(button.dataset.stage));
  });
  refresh();
}

init();
