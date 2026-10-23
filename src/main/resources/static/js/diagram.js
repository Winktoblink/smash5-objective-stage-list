// A schematic SVG of one stage, drawn from its measurements. It is original artwork and not a picture of
// the stage: the blast zones, the main stage and the ledges are to scale, and Battlefield's outline is laid
// over it for comparison. The stage is drawn centered on x = 0 with its top surface at y = 0, which is an
// assumption, and platforms are left out because the data has no platform positions.
// Colors come from CSS classes (see app.css), so the diagram follows the page's light and dark themes.

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

function rect(box, cls) {
  // SVG's y axis points down, so the game's top edge is -top.
  return `<rect class="${cls}" x="${n(box.left)}" y="${n(-box.top)}" width="${n(box.right - box.left)}" height="${n(box.top - box.bottom)}" vector-effect="non-scaling-stroke"/>`;
}

function stageBar(width, cls) {
  const half = width / 2;
  return `<line class="${cls}" x1="${n(-half)}" y1="0" x2="${n(half)}" y2="0" vector-effect="non-scaling-stroke"/>`;
}

/**
 * Returns the SVG markup for `stage`. `reference` is the stage to overlay (Battlefield) or null.
 * With `options.label` the stage name is also written inside the picture, for the detail view.
 */
export function stageDiagram(stage, reference = null, options = {}) {
  const own = extents(stage);
  const ref = reference && reference.id !== stage.id ? extents(reference) : null;

  const boxes = [own.far, ...(ref ? [ref.far] : [])];
  const left = Math.min(...boxes.map((b) => b.left));
  const right = Math.max(...boxes.map((b) => b.right));
  const top = Math.max(...boxes.map((b) => b.top));
  const bottom = Math.min(...boxes.map((b) => b.bottom));
  const pad = Math.max(right - left, top - bottom) * 0.04;
  const viewBox = [left - pad, -top - pad, right - left + 2 * pad, top - bottom + 2 * pad].map(n).join(' ');

  const parts = [];
  parts.push(rect(own.far, 'dg-far'));
  if (JSON.stringify(own.near) !== JSON.stringify(own.far)) parts.push(rect(own.near, 'dg-near'));
  if (ref) {
    parts.push(rect(ref.near, 'dg-ref'));
    parts.push(stageBar(reference.stageWidth, 'dg-ref'));
  }
  parts.push(stageBar(stage.stageWidth, 'dg-stage'));
  if (stage.ledgeCount.max > 0) {
    const half = stage.stageWidth / 2;
    const r = Math.max(right - left, top - bottom) * 0.012;
    parts.push(`<circle class="dg-ledge" cx="${n(-half)}" cy="0" r="${n(r)}"/><circle class="dg-ledge" cx="${n(half)}" cy="0" r="${n(r)}"/>`);
  }
  if (options.label) {
    const size = Math.max(right - left, top - bottom) * 0.045;
    parts.push(`<text class="dg-label" x="${n(left + pad)}" y="${n(-top + pad + size)}" font-size="${n(size)}">${escapeXml(stage.name)}</text>`);
  }

  const description = `Diagram of ${stage.name}: blast zones, main stage and ledges to scale${ref ? ', with Battlefield outlined for comparison' : ''}.`;
  return `<svg class="diagram" viewBox="${viewBox}" role="img" aria-label="${escapeXml(description)}" xmlns="http://www.w3.org/2000/svg"><title>${escapeXml(description)}</title>${parts.join('')}</svg>`;
}
