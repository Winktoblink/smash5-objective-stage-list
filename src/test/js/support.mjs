import { readFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);

export const stages = JSON.parse(readFileSync(new URL('src/main/resources/static/data/stages.json', root), 'utf8'));
export const conformance = JSON.parse(readFileSync(new URL('src/test/resources/search-conformance.json', root), 'utf8'));
export const byName = (name) => stages.find((s) => s.name === name);
