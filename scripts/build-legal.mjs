// Generates supabase/functions/legal/content.ts from the markdown in docs/.
//
// Edge Functions bundle only what is imported, so Deno.readTextFile cannot
// reach a sibling .md file at runtime -- the first version deployed cleanly
// and then returned 500 for every request. Embedding the text as a module is
// what actually works.
//
// Generated rather than hand-maintained so docs/ stays the single source of
// truth: a policy that disagrees with the published page is worse than either
// version alone. Re-run after editing either document:
//
//   npm run build:legal   (from app/)  or  node scripts/build-legal.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(ROOT, 'docs', f), 'utf8');

const out = `// GENERATED FILE -- do not edit.
// Source: docs/privacy-policy.md and docs/terms-of-service.md
// Regenerate with: node scripts/build-legal.mjs
export const PRIVACY = ${JSON.stringify(read('privacy-policy.md'))};
export const TERMS = ${JSON.stringify(read('terms-of-service.md'))};
`;
writeFileSync(join(ROOT, 'supabase/functions/legal/content.ts'), out);
console.log(`content.ts written (${out.length} bytes)`);
