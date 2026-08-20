// Probe every static PostgREST query in the repositories against the live API.
//
// These queries are opaque strings, so tsc cannot see into them: a renamed
// column, a dropped table, or an embed made ambiguous by a NEW foreign key
// elsewhere all compile perfectly and fail only at runtime, on whichever
// screen happens to run them.
//
// That is not hypothetical. Adding the endorsements table (FKs to both
// players and profiles) made PostgREST infer a second players<->profiles
// relationship and silently broke three unrelated screens -- Reels, trial
// applicants and the inbox -- with nothing in the build to show for it.
//
// Run against a project the anon key can reach:
//   node scripts/verify-queries.mjs
//
// An empty result or a permission error is a PASS: RLS returning nothing to
// anon is the system working. Only schema/query faults are failures.
//
// Every .from() is ACCOUNTED FOR, not just the ones that happen to match.
// The first version of this script paired .from() with .select() inside a
// fixed character window, and a seven-line explanatory comment between them
// pushed the Reels query out of range -- so the one query it was written to
// catch was silently skipped while the run reported all green. A harness that
// quietly misses things is worse than no harness, so anything unclassified is
// now a hard failure.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolved from this file's own location, so the script works whether it is
// run from the repo root or from app/ via npm.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV = readFileSync(join(ROOT, 'app/.env'), 'utf8');
const pick = (k) => ENV.match(new RegExp(`${k}=(.*)`))?.[1].trim().replace(/["'\r]/g, '');
const URL_ = pick('SUPABASE_URL');
const KEY = pick('SUPABASE_ANON_KEY');
if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY in app/.env'); process.exit(2); }

const DIR = join(ROOT, 'app/src/repositories');
const SCHEMA_FAULTS = /^(PGRST1\d\d|PGRST2\d\d|42703|42P01|42883)$/;

// Comments are stripped before matching so prose between .from() and
// .select() cannot hide a query. Replaced with spaces to keep line numbers.
const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
   .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

const probes = [], writes = [], dynamic = [], unpaired = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.ts'))) {
  const src = strip(readFileSync(join(DIR, f), 'utf8'));
  // Storage buckets are also addressed as supabase.storage.from('bucket'),
  // which is not a table and has no REST select to probe. Excluded by
  // requiring .from() is NOT preceded by `storage`, allowing for the
  // linebreak the formatter puts between them.
  const froms = [...src.matchAll(/(storage\s*)?\.from\(\s*'([^']+)'\s*\)/g)].filter((m) => !m[1]);
  for (const m of froms) {
    const table = m[2];
    const line = src.slice(0, m.index).split('\n').length;
    const at = `${f}:${line}`;
    // Look ahead only as far as the next .from(), so a query is never paired
    // with a later query's select.
    const nextFrom = src.indexOf(".from('", m.index + 1);
    const tail = src.slice(m.index, nextFrom === -1 ? undefined : nextFrom);

    const sel = tail.match(/\.select\(\s*(['"`])([\s\S]*?)\1/);
    const write = tail.match(/\.(insert|update|upsert|delete)\(/);
    if (sel) {
      if (sel[1] === '`' || sel[2].includes('${')) dynamic.push(`${at} ${table}`);
      else probes.push({ at, table, cols: sel[2].replace(/\s+/g, ' ').trim() });
    } else if (write) writes.push(`${at} ${table} (.${write[1]})`);
    else unpaired.push(`${at} ${table}`);
  }
}

let failed = 0;
for (const q of probes) {
  const url = `${URL_}/rest/v1/${q.table}?select=${encodeURIComponent(q.cols)}&limit=1`;
  let body, code = '';
  try {
    const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    body = await res.json();
    code = body?.code ?? '';
  } catch (e) { code = 'NETWORK'; body = { message: String(e) }; }

  if (SCHEMA_FAULTS.test(code)) {
    failed++;
    console.log(`FAIL  ${q.at}  ${q.table}\n      ${code}: ${body.message}`);
    if (body.hint) console.log(`      hint: ${body.hint}`);
  } else console.log(`ok    ${q.at}  ${q.table}`);
}

const total = probes.length + writes.length + dynamic.length + unpaired.length;
console.log(`\naccounted for ${total} .from() call(s):`);
console.log(`  ${probes.length} probed, ${writes.length} write-only, ${dynamic.length} dynamic select`);
if (dynamic.length) { console.log('\ndynamic selects -- verify by hand:'); dynamic.forEach((d) => console.log(`      ${d}`)); }
if (unpaired.length) {
  console.log(`\n${unpaired.length} .from() neither probed nor classified -- the extractor is wrong, fix it:`);
  unpaired.forEach((u) => console.log(`      ${u}`));
}
console.log(`\n${failed} schema fault(s).`);
process.exit(failed || unpaired.length ? 1 : 0);
