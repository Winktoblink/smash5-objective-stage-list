// A schematic diagram of one stage, drawn from its measurements. It is original artwork and not a picture of
// the stage: the blast zones, the main stage and the ledges are to scale, and Battlefield's outline is laid
// over it for comparison. The stage is drawn centered on x = 0 with its top surface at y = 0, which is an
// assumption, and platforms are left out because the data has no platform positions.
//
// `diagramModel` describes the picture as plain shapes. `stageDiagram` turns the model into SVG for the page,
// and export.js draws the same model on a canvas, so both show the same thing. Colors come from the shapes'
// `cls` names: CSS classes in the page (see app.css) and a color table in the image export.

const escapeXml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const n = (value) => Math.round(value * 10) / 10;

/** The nearest and furthest blast zone edges, in game units (y up). */
export function extents(stage) {
  const z = stage.blastZones;
  return {
    near: { left: z.left.max, right: z.right.min, top: z.top.min, bottom: z.bottom.max },
    far: { left: z.left.min, right: z.right.max, top: z.top.max, bottom: z.bottom.min },
  };
}

// SVG's y axis points down, so the game's top edge is drawn at -top.
function rect(box, cls) {
  return { kind: 'rect', cls, x: box.left, y: -box.top, w: box.right - box.left, h: box.top - box.bottom };
}

function stageBar(width, cls) {
  return { kind: 'line', cls, x1: -width / 2, y1: 0, x2: width / 2, y2: 0 };
}

/**
 * The picture of `stage` as `{ view, shapes, description }`. `reference` is the stage to overlay (Battlefield)
 * or null. With `options.label` the stage name is also a shape, for the detail view.
 * `view` is `{ x, y, w, h }`; each shape is a `rect`, `line`, `circle` or `text` with a `cls`.
 */
export function diagramModel(stage, reference = null, options = {}) {
  const own = extents(stage);
  const ref = reference && reference.id !== stage.id ? extents(reference) : null;

  const boxes = [own.far, ...(ref ? [ref.far] : [])];
  const left = Math.min(...boxes.map((b) => b.left));
  const right = Math.max(...boxes.map((b) => b.right));
  const top = Math.max(...boxes.map((b) => b.top));
  const bottom = Math.min(...boxes.map((b) => b.bottom));
  const size = Math.max(right - left, top - bottom);
  const pad = size * 0.04;

  const shapes = [rect(own.far, 'dg-far')];
  if (JSON.stringify(own.near) !== JSON.stringify(own.far)) shapes.push(rect(own.near, 'dg-near'));
  if (ref) {
    shapes.push(rect(ref.near, 'dg-ref'), stageBar(reference.stageWidth, 'dg-ref'));
  }
  shapes.push(stageBar(stage.stageWidth, 'dg-stage'));
  if (stage.ledgeCount.max > 0) {
    const half = stage.stageWidth / 2;
    const r = size * 0.012;
    shapes.push({ kind: 'circle', cls: 'dg-ledge', cx: -half, cy: 0, r }, { kind: 'circle', cls: 'dg-ledge', cx: half, cy: 0, r });
  }
  if (options.label) {
    const fontSize = size * 0.045;
    shapes.push({ kind: 'text', cls: 'dg-label', x: left + pad, y: -top + pad + fontSize, size: fontSize, text: stage.name });
  }

  return {
    view: { x: left - pad, y: -top - pad, w: right - left + 2 * pad, h: top - bottom + 2 * pad },
    shapes,
    description: `Diagram of ${stage.name}: blast zones, main stage and ledges to scale${ref ? ', with Battlefield outlined for comparison' : ''}.`,
  };
}

function svgShape(s) {
  const stroke = 'vector-effect="non-scaling-stroke"';
  switch (s.kind) {
    case 'rect': return `<rect class="${s.cls}" x="${n(s.x)}" y="${n(s.y)}" width="${n(s.w)}" height="${n(s.h)}" ${stroke}/>`;
    case 'line': return `<line class="${s.cls}" x1="${n(s.x1)}" y1="${n(s.y1)}" x2="${n(s.x2)}" y2="${n(s.y2)}" ${stroke}/>`;
    case 'circle': return `<circle class="${s.cls}" cx="${n(s.cx)}" cy="${n(s.cy)}" r="${n(s.r)}"/>`;
    default: return `<text class="${s.cls}" x="${n(s.x)}" y="${n(s.y)}" font-size="${n(s.size)}">${escapeXml(s.text)}</text>`;
  }
}

/** The SVG markup for `stage` (see {@link diagramModel}). */
export function stageDiagram(stage, reference = null, options = {}) {
  const { view, shapes, description } = diagramModel(stage, reference, options);
  const viewBox = [view.x, view.y, view.w, view.h].map(n).join(' ');
  return `<svg class="diagram" viewBox="${viewBox}" role="img" aria-label="${escapeXml(description)}" xmlns="http://www.w3.org/2000/svg"><title>${escapeXml(description)}</title>${shapes.map(svgShape).join('')}</svg>`;
}
