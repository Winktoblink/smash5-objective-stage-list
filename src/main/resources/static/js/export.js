// Turning the builder into something to publish: ruleset Markdown for start.gg's rules tab and a PNG image.
// Pure functions, no DOM: the image renderer draws on any object that has the Canvas 2D methods it uses,
// so Node can test it with a recording stand-in.

import { DSR_OPTIONS, strikingOrder } from './builder.js';
import { diagramModel } from './diagram.js';

/**
 * Editable defaults for the game settings. `forms` is free text for the Battlefield and Omega forms rule and
 * is left empty on purpose: it is left out of the export until someone writes a rule.
 */
export const DEFAULT_GAME = {
  stocks: '3',
  time: '7:00',
  hazards: 'Off',
  items: 'Off',
  finalSmash: 'Off',
  spirits: 'Off',
  forms: '',
};

export const GAME_FIELDS = [
  { key: 'stocks', label: 'Stocks' },
  { key: 'time', label: 'Time' },
  { key: 'hazards', label: 'Hazards' },
  { key: 'items', label: 'Items' },
  { key: 'finalSmash', label: 'Final Smash meter' },
  { key: 'spirits', label: 'Spirits' },
  { key: 'forms', label: 'Battlefield and Ω forms' },
];

const dsrLabel = (value) => DSR_OPTIONS.find((o) => o.value === value)?.label ?? 'No DSR';

/** One sentence per stage rule, shared by the Markdown and the image. */
export function ruleLines(builder) {
  const bans = builder.bans === 0
    ? 'The winner of a game does not ban any stages.'
    : `After each game the winner bans ${builder.bans} stage${builder.bans === 1 ? '' : 's'}.`;
  const dsr = builder.dsr === 'none' ? 'No stage repeat rule (DSR is not in effect).' : `${dsrLabel(builder.dsr)} is in effect.`;
  return [bans, dsr, `Gentleman's Rule: ${builder.gentlemansRule ? 'on' : 'off'}.`];
}

/** The game settings with a value, as `[label, value]` pairs. A blank value is left out. */
export function gameLines(game) {
  return GAME_FIELDS.map(({ key, label }) => [label, (game[key] ?? '').trim()]).filter(([, value]) => value !== '');
}

/**
 * Markdown for start.gg's rules tab. `names` maps stage id to name; `missing` lists the names of preset stages
 * that the data doesn't have, as `{ starters: [], counterpicks: [] }`.
 */
export function rulesetMarkdown(builder, game, names, missing = { starters: [], counterpicks: [] }) {
  const list = (ids, extra) => {
    const items = [...ids.map((id) => names.get(id) ?? `Stage ${id}`), ...extra];
    return items.length ? items.map((name) => `- ${name}`) : ['None.'];
  };
  const starters = builder.starters.length + missing.starters.length;
  const counterpicks = builder.counterpicks.length + missing.counterpicks.length;
  const order = strikingOrder(starters);

  return [
    '# Stage list',
    '',
    `## Starters (${starters})`,
    '',
    ...(order ? [`Game 1 striking order: ${order}.`, ''] : []),
    ...list(builder.starters, missing.starters),
    '',
    `## Counterpicks (${counterpicks})`,
    '',
    ...list(builder.counterpicks, missing.counterpicks),
    '',
    '## Stage rules',
    '',
    ...ruleLines(builder).map((line) => `- ${line}`),
    '',
    '## Game settings',
    '',
    ...gameLines(game).map(([label, value]) => `- ${label}: ${value}`),
    '',
  ].join('\n');
}

// ---------- image ----------

export const IMAGE = { width: 1200, height: 675 };

/** How each diagram shape is drawn: `stroke` or `fill` is a key of the color table. */
const SHAPE_STYLE = {
  'dg-far': { stroke: 'zoneFar', dash: [4, 3], width: 1 },
  'dg-near': { stroke: 'zoneNear', fill: 'zoneNear', fillAlpha: 0.12, width: 1 },
  'dg-stage': { stroke: 'stage', width: 3 },
  'dg-ledge': { fill: 'ledge' },
  'dg-ref': { stroke: 'ref', dash: [2, 2], width: 1.5 },
  'dg-label': { fill: 'text' },
};

/** Draws one diagram model inside the box `{ x, y, w, h }`, keeping its proportions. */
function drawDiagram(ctx, model, box, colors) {
  const { view, shapes } = model;
  const scale = Math.min(box.w / view.w, box.h / view.h);
  const ox = box.x + (box.w - view.w * scale) / 2 - view.x * scale;
  const oy = box.y + (box.h - view.h * scale) / 2 - view.y * scale;
  const px = (x) => ox + x * scale;
  const py = (y) => oy + y * scale;

  for (const s of shapes) {
    if (s.kind === 'text') continue; // names are written under the tile instead
    const style = SHAPE_STYLE[s.cls] ?? {};
    ctx.save();
    ctx.setLineDash(style.dash ?? []);
    ctx.lineWidth = style.width ?? 1;
    if (s.kind === 'rect') {
      if (style.fill) {
        ctx.globalAlpha = style.fillAlpha ?? 1;
        ctx.fillStyle = colors[style.fill];
        ctx.fillRect(px(s.x), py(s.y), s.w * scale, s.h * scale);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = colors[style.stroke];
      ctx.strokeRect(px(s.x), py(s.y), s.w * scale, s.h * scale);
    } else if (s.kind === 'line') {
      ctx.strokeStyle = colors[style.stroke];
      ctx.beginPath();
      ctx.moveTo(px(s.x1), py(s.y1));
      ctx.lineTo(px(s.x2), py(s.y2));
      ctx.stroke();
    } else if (s.kind === 'circle') {
      ctx.fillStyle = colors[style.fill];
      ctx.beginPath();
      ctx.arc(px(s.cx), py(s.cy), Math.max(s.r * scale, 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

const PER_ROW = 8;
const MARGIN = 40;
const GAP = 12;

/**
 * Draws the stage list as a 1200x675 picture: a title, a Starters row and a Counterpicks row of diagram tiles
 * with names, and the rules and game settings in small print.
 *
 * `data` is `{ title, starters, counterpicks, reference, rules, settings, missing }`: `starters` and
 * `counterpicks` are stage objects, `rules` and `settings` are lines of text, and `missing` is how many stages
 * the data doesn't have. `colors` has bg, text, muted, border, accent, zoneFar, zoneNear, stage, ledge and ref.
 */
export function renderStageListImage(ctx, data, colors) {
  const { width, height } = IMAGE;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colors.text;
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText(data.title, MARGIN, MARGIN + 28);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = colors.muted;
  ctx.fillText(data.rules.join('  ·  '), MARGIN, MARGIN + 54);

  const tileW = Math.min(136, (width - 2 * MARGIN - (PER_ROW - 1) * GAP) / PER_ROW);
  const tileH = 86;
  let y = MARGIN + 86;

  const section = (label, stages, notInData) => {
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText(`${label} (${stages.length + notInData})`, MARGIN, y + 16);
    y += 28;
    const shown = stages.slice(0, PER_ROW * 2);
    if (!shown.length) {
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = colors.muted;
      ctx.fillText(notInData ? `${notInData} not in the data yet` : 'None', MARGIN, y + 20);
      y += 36;
      return;
    }
    shown.forEach((stage, i) => {
      const x = MARGIN + (i % PER_ROW) * (tileW + GAP);
      const top = y + Math.floor(i / PER_ROW) * (tileH + 30);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(x, top, tileW, tileH);
      drawDiagram(ctx, diagramModel(stage, data.reference), { x: x + 4, y: top + 4, w: tileW - 8, h: tileH - 8 }, colors);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = colors.text;
      ctx.fillText(fitText(ctx, stage.name, tileW), x, top + tileH + 16);
    });
    if (notInData && stages.length < PER_ROW) {
      // Stages the data doesn't have can't be drawn, so say how many there are in the next free slot.
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = colors.muted;
      ctx.fillText(`+${notInData} not in the data yet`, MARGIN + shown.length * (tileW + GAP), y + tileH / 2);
    }
    const rows = Math.ceil(shown.length / PER_ROW);
    y += rows * (tileH + 30) + 4;
    if (stages.length > shown.length) {
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = colors.muted;
      ctx.fillText(`+${stages.length - shown.length} more`, MARGIN, y + 8);
      y += 16;
    }
  };

  section('Starters', data.starters, data.missing?.starters ?? 0);
  section('Counterpicks', data.counterpicks, data.missing?.counterpicks ?? 0);

  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = colors.muted;
  ctx.fillText(data.settings.join('  ·  '), MARGIN, height - MARGIN + 6);
  ctx.fillText('Schematic diagrams to scale, not game screenshots. Made with Smash Objective Stage List.', MARGIN, height - MARGIN + 24);
}
