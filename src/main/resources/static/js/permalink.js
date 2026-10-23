// The page's whole state in the address: `#v1.<base64url(JSON)>`. Pure functions, no DOM.
//
// The state is `{ plain, builder, game }`: the criteria in the page's plain terms (including the match mode),
// the builder's lists and settings (stage ids, never names), and the game settings used by the export.
// Decoding never trusts its input: every field is checked and anything wrong is replaced by its default.

import { FEATURES, RANGE_MATCH } from './criteria.js';
import { DSR_OPTIONS, emptyBuilder } from './builder.js';
import { DEFAULT_GAME } from './export.js';

export const VERSION = 'v1';
const MEASUREMENT_KEYS = ['sides', 'left', 'right', 'top', 'bottom', 'stageWidth', 'distanceToBlastZone', 'ledgeCount'];
const MAX_TEXT = 200;

export function defaultState() {
  const plain = { features: {}, rangeMatch: RANGE_MATCH.CONTAINED, separateSides: false };
  for (const key of MEASUREMENT_KEYS) plain[key] = { min: null, max: null };
  return { plain, builder: emptyBuilder(), game: { ...DEFAULT_GAME } };
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/** The address fragment for a state, starting with `#`. */
export function encode(state) {
  return `#${VERSION}.${toBase64Url(JSON.stringify(state))}`;
}

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const text = (value, fallback) => (typeof value === 'string' ? value.slice(0, MAX_TEXT) : fallback);

function cleanPlain(raw) {
  const plain = defaultState().plain;
  if (!isObject(raw)) return plain;
  for (const key of MEASUREMENT_KEYS) {
    plain[key] = { min: number(raw[key]?.min), max: number(raw[key]?.max) };
  }
  if (isObject(raw.features)) {
    for (const { key } of FEATURES) {
      if (typeof raw.features[key] === 'boolean') plain.features[key] = raw.features[key];
    }
  }
  if (raw.rangeMatch === RANGE_MATCH.OVERLAPS) plain.rangeMatch = RANGE_MATCH.OVERLAPS;
  plain.separateSides = raw.separateSides === true;
  return plain;
}

/** Keeps the ids that exist, once each, and counts how many were dropped. */
function cleanIds(raw, valid) {
  const kept = [];
  let dropped = 0;
  for (const id of Array.isArray(raw) ? raw : []) {
    if (Number.isInteger(id) && valid.has(id)) {
      if (!kept.includes(id)) kept.push(id);
    } else {
      dropped += 1;
    }
  }
  return { kept, dropped };
}

function cleanBuilder(raw, { stageIds, presetIds }, counters) {
  const builder = emptyBuilder();
  if (!isObject(raw)) return builder;
  const starters = cleanIds(raw.starters, stageIds);
  const counterpicks = cleanIds(raw.counterpicks, stageIds);
  counters.dropped += starters.dropped + counterpicks.dropped;
  builder.starters = starters.kept;
  builder.counterpicks = counterpicks.kept.filter((id) => !starters.kept.includes(id));
  builder.bans = Number.isInteger(raw.bans) && raw.bans >= 0 && raw.bans <= 4 ? raw.bans : builder.bans;
  builder.dsr = DSR_OPTIONS.some((o) => o.value === raw.dsr) ? raw.dsr : builder.dsr;
  builder.gentlemansRule = raw.gentlemansRule === true;
  const missing = (value) => (Number.isInteger(value) && value >= 0 && value <= 20 ? value : 0);
  if (typeof raw.loadedPreset === 'string' && presetIds.has(raw.loadedPreset)) {
    builder.loadedPreset = raw.loadedPreset;
    builder.missingStarters = missing(raw.missingStarters);
    builder.missingCounterpicks = missing(raw.missingCounterpicks);
  }
  return builder;
}

function cleanGame(raw) {
  const game = { ...DEFAULT_GAME };
  if (!isObject(raw)) return game;
  for (const key of Object.keys(DEFAULT_GAME)) game[key] = text(raw[key], DEFAULT_GAME[key]);
  return game;
}

const READ_FAILURE = "That link couldn't be read, so the page started from scratch.";

/**
 * Reads a state back from `location.hash`. `valid` is `{ stageIds: Set, presetIds: Set }`.
 * Returns `{ state, notices }`; `notices` are sentences for the user. An empty hash gives the default state
 * and no notice. An unknown version or bad input gives the default state and a notice.
 */
export function decode(hash, valid) {
  const fallback = (notice) => ({ state: defaultState(), notices: [notice] });
  if (!hash || hash === '#') return { state: defaultState(), notices: [] };

  const match = /^#(v\d+)\.(.*)$/.exec(hash);
  if (!match) return fallback(READ_FAILURE);
  if (match[1] !== VERSION) {
    return fallback('That link was made by a different version of this page, so the page started from scratch.');
  }

  let raw;
  try {
    raw = JSON.parse(fromBase64Url(match[2]));
  } catch {
    return fallback(READ_FAILURE);
  }
  if (!isObject(raw)) return fallback(READ_FAILURE);

  const counters = { dropped: 0 };
  const state = {
    plain: cleanPlain(raw.plain),
    builder: cleanBuilder(raw.builder, valid, counters),
    game: cleanGame(raw.game),
  };
  const one = counters.dropped === 1;
  const notices = counters.dropped
    ? [`${counters.dropped} stage${one ? '' : 's'} in that link no longer ${one ? 'exists' : 'exist'} and ${one ? 'was' : 'were'} dropped.`]
    : [];
  return { state, notices };
}

/** True when a state is the same as a fresh page, so no address needs to be written. */
export function isDefault(state) {
  const valid = {
    stageIds: new Set([...state.builder.starters, ...state.builder.counterpicks]),
    presetIds: new Set(state.builder.loadedPreset ? [state.builder.loadedPreset] : []),
  };
  return JSON.stringify(decode(encode(state), valid).state) === JSON.stringify(defaultState());
}
