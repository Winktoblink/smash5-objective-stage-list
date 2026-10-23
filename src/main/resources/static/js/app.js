// DOM wiring only. The rules live in criteria.js, the wording in explain.js and the pictures in diagram.js.
// Every URL is relative so the page works wherever it is hosted (for example under /repo-name/ on GitHub Pages).

import {
  FEATURES, RANGE_MATCH, WIDTH, classify, isEmpty, signedToDistanceRange, toCriteria,
} from './criteria.js';
import { describeMode, explainFailure, formatRange, measurementRows, summaryLine } from './explain.js';
import { stageDiagram } from './diagram.js';
import { CRITERIA_PRESETS, missingCount, visibleStagePresets } from './presets.js';
import {
  DSR_OPTIONS, addStage, emptyBuilder, fromPreset, removeStage, strikingOrder, validate,
} from './builder.js';
import { compareLists, diffWithPreset } from './diff.js';

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
let builder = emptyBuilder();
let presets = [];

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
  const choose = el('div', { class: 'choose' },
    el('button', { type: 'button', 'data-add': 'starters', 'data-id': stage.id, 'aria-pressed': String(builder.starters.includes(stage.id)) }, 'Starter'),
    el('button', { type: 'button', 'data-add': 'counterpicks', 'data-id': stage.id, 'aria-pressed': String(builder.counterpicks.includes(stage.id)) }, 'Counterpick'));
  return el('li', { class: 'stage' }, picture,
    el('div', {}, name, el('p', { class: 'numbers' }, summaryLine(stage)), why, choose));
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
  renderBuilder(criteria);
  renderDiff(criteria);
}

// ---------- the stage-list builder ----------

function tile(id) {
  const stage = stages.find((s) => s.id === id);
  if (!stage) return null;
  const picture = el('div');
  picture.innerHTML = stageDiagram(stage, references[0] ?? null);
  return el('li', { class: 'tile' }, picture, el('div', {}, stage.name),
    el('button', { type: 'button', class: 'remove', 'data-remove': id, 'aria-label': `Remove ${stage.name}` }, 'Remove'));
}

function tiles(list, missing) {
  const items = builder[list].map(tile).filter(Boolean);
  const notInData = missing.map((name) => el('li', { class: 'empty' }, `${name} (not in the data yet)`));
  return items.length + notInData.length ? [...items, ...notInData] : [el('li', { class: 'empty' }, 'None chosen yet.')];
}

function renderBuilder(criteria) {
  const missing = builder.loadedPreset ? presets.find((p) => p.id === builder.loadedPreset)?.missing : null;
  const starterCount = builder.starters.length + builder.missingStarters;
  const counterCount = builder.counterpicks.length + builder.missingCounterpicks;
  $('starters-heading').textContent = `Starters (${starterCount})`;
  $('counterpicks-heading').textContent = `Counterpicks (${counterCount})`;
  $('starters').replaceChildren(...tiles('starters', missing?.starters ?? []));
  $('counterpicks').replaceChildren(...tiles('counterpicks', missing?.counterpicks ?? []));
  const order = strikingOrder(starterCount);
  $('striking-order').textContent = order
    ? `Use ${order} for game 1 striking.`
    : 'Pick 3, 5 or 7 starters for a standard game 1 striking order (1-1, 1-2-1 or 1-2-2-1).';
  $('set-bans').value = String(builder.bans);
  $('set-dsr').value = builder.dsr;
  $('set-gentleman').checked = builder.gentlemansRule;
  $('builder-messages').replaceChildren(...validate(builder, stages, criteria)
    .map((m) => el('li', { class: m.level }, m.message)));
  const preset = presets.find((p) => p.id === $('list-preset').value);
  $('preset-info').textContent = preset ? presetInfo(preset) : '';
}

function presetInfo(preset) {
  const gap = missingCount(preset);
  const parts = [`Source: ${preset.source} (checked ${preset.checked}).`, preset.note];
  if (!preset.reviewed) parts.push('Not yet reviewed by the project owner.');
  if (gap) {
    const names = [...preset.missing.starters, ...preset.missing.counterpicks].join(', ');
    parts.push(`${gap} stage${gap === 1 ? '' : 's'} not in the data yet: ${names}.`);
  }
  return parts.join(' ');
}

function diffGroup(title, entries, withReasons, mode) {
  const items = entries.map(({ stage, failures }) => el('li', {}, stage.name,
    ...(withReasons ? [el('ul', { class: 'why' }, ...failures.map((f) => el('li', {}, explainFailure(f, mode))))] : [])));
  const details = el('details', { class: 'group' }, el('summary', {}, `${title} (${entries.length})`));
  details.open = true;
  details.append(items.length ? el('ul', { class: 'diff-list' }, ...items) : el('p', { class: 'hint' }, 'None.'));
  return details;
}

function renderDiff(criteria) {
  const preset = presets.find((p) => p.id === $('compare-preset').value);
  if (!preset) {
    $('diff').replaceChildren();
    return;
  }
  const mode = criteria.rangeMatch ?? RANGE_MATCH.CONTAINED;
  const diff = diffWithPreset(stages, criteria, preset);
  const nodes = [
    diffGroup(`Your criteria allow these, but ${preset.name} bans them`, diff.onlyCriteria, false, mode),
    diffGroup(`${preset.name} allows these, but your criteria exclude them`, diff.onlyPreset, true, mode),
    diffGroup('Both agree', diff.both, false, mode),
  ];
  if (diff.missing.length) {
    nodes.push(el('p', { class: 'hint' }, `Not compared, because they are not in the data yet: ${diff.missing.join(', ')}.`));
  }
  if (builder.starters.length + builder.counterpicks.length) {
    const lists = compareLists(builder, preset);
    const name = (id) => stages.find((s) => s.id === id)?.name ?? id;
    nodes.push(el('p', { class: 'hint' },
      `Your builder lists vs ${preset.name}: ${lists.shared.length} shared; added by you: `
      + `${lists.added.map(name).join(', ') || 'none'}; left out: ${lists.leftOut.map(name).join(', ') || 'none'}.`));
  }
  $('diff').replaceChildren(...nodes);
}

function buildPresetTools() {
  presets = visibleStagePresets(new URLSearchParams(location.search).has('review'));
  $('set-dsr').replaceChildren(...DSR_OPTIONS.map((o) => el('option', { value: o.value }, o.label)));
  if (!presets.length) return;
  $('preset-tools').hidden = false;
  const label = (p) => (p.reviewed ? p.name : `${p.name} (not yet reviewed)`);
  $('list-preset').replaceChildren(...presets.map((p) => el('option', { value: p.id }, label(p))));
  $('compare-preset').replaceChildren(el('option', { value: '' }, 'Choose a stage list…'),
    ...presets.map((p) => el('option', { value: p.id }, label(p))));
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
  buildPresetTools();
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
    const add = event.target.closest('[data-add]');
    if (add) {
      const id = Number(add.dataset.id);
      const list = add.dataset.add;
      builder = builder[list].includes(id) ? removeStage(builder, id) : addStage(builder, list, id);
      refresh();
      return;
    }
    const button = event.target.closest('[data-stage]');
    if (button) openDetail(Number(button.dataset.stage));
  });
  $('builder').addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove]');
    if (remove) {
      builder = removeStage(builder, Number(remove.dataset.remove));
      refresh();
    }
  });
  $('set-bans').addEventListener('change', (event) => { builder = { ...builder, bans: Number(event.target.value) }; refresh(); });
  $('set-dsr').addEventListener('change', (event) => { builder = { ...builder, dsr: event.target.value }; refresh(); });
  $('set-gentleman').addEventListener('change', (event) => { builder = { ...builder, gentlemansRule: event.target.checked }; refresh(); });
  $('load-list').addEventListener('click', () => {
    const preset = presets.find((p) => p.id === $('list-preset').value);
    if (preset) {
      builder = { ...fromPreset(preset), loadedPreset: preset.id };
      refresh();
    }
  });
  $('clear-list').addEventListener('click', () => { builder = emptyBuilder(); refresh(); });
  $('list-preset').addEventListener('change', refresh);
  $('compare-preset').addEventListener('change', refresh);
  refresh();

}

init();
