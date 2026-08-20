// Assert the theme's elevation ladder actually ascends, and that text on each
// level passes WCAG AA.
//
// Two ordering bugs have already shipped in this codebase and neither was
// visible by reading the hex values:
//
//   1. The rating card's dark gradient bottomed out at luminance 0.0061
//      against an app background of 0.0079 -- the hero element sank into the
//      page instead of lifting off it.
//   2. darkColors.surfaceMuted (0.0149) sat ABOVE surface (0.0112), so every
//      card on a muted page receded, and every muted chip inside a card
//      floated above it. Light mode had the order right the whole time.
//
// Hex codes do not sort by perceived lightness, so "is #182036 lighter than
// #131B2E" is not answerable by eye. Measure it.
//
//   node scripts/verify-theme.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const colorsSrc = readFileSync(join(ROOT, 'app/src/theme/colors.ts'), 'utf8');
const elevSrc = readFileSync(join(ROOT, 'app/src/theme/elevation.ts'), 'utf8');

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Pull the dark block only -- light and dark share key names.
const darkBlock = colorsSrc.slice(colorsSrc.indexOf('export const darkColors'));
// Parsed line-by-line rather than with a regex. The first version built the
// pattern inside a template literal, where `\s` is not an escape sequence at
// all -- it collapses to a bare `s`, so the pattern read `^s*background:` and
// silently matched nothing. Every token came back undefined and the run
// "failed" for the wrong reason. Line scanning has no escaping to get wrong.
const readHex = (src, name) => {
  for (const line of src.split(String.fromCharCode(10))) {
    const t = line.trim();
    if (!t.startsWith(name + ':')) continue;
    const m = t.match(/(#[0-9A-Fa-f]{6})/);
    if (m) return m[1];
  }
  return undefined;
};
const tok = (name) => readHex(darkBlock, name);
const elev = (name) => readHex(elevSrc.slice(elevSrc.indexOf('const DARK')), name);

let bad = 0;
const fail = (m) => { bad++; console.log(`FAIL  ${m}`); };

const ladder = [
  ['background', tok('background')],
  ['surfaceMuted', tok('surfaceMuted')],
  ['surface', tok('surface')],
  ['elevation raised', elev('raised')],
  ['elevation floating', elev('floating')],
  ['elevation overlay', elev('overlay')],
];

console.log('dark elevation ladder (must strictly ascend):');
for (const [i, [name, hex]] of ladder.entries()) {
  if (!hex) { fail(`${name}: could not read a hex value -- has the token been renamed?`); continue; }
  const l = lum(hex);
  const prev = i ? ladder[i - 1] : null;
  const ok = !prev || !prev[1] || l > lum(prev[1]);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(20)} ${hex}  ${l.toFixed(4)}`);
  if (!ok) { bad++; console.log(`        ^ sits at or below ${prev[0]} (${lum(prev[1]).toFixed(4)}) -- it will recede, not lift`); }
}

console.log('\nAA contrast for text on each dark level:');
const texts = [['textPrimary', tok('textPrimary')], ['textBody', tok('textBody')], ['textMuted', tok('textMuted')]];
for (const [bgName, bg] of ladder) {
  if (!bg) continue;
  for (const [tName, t] of texts) {
    if (!t) continue;
    const r = ratio(t, bg);
    if (r < 4.5) fail(`${tName} on ${bgName}: ${r.toFixed(2)}:1 (needs 4.5:1)`);
  }
}
if (!bad) console.log('  all pass');

// No raw font size below the scale's floor.
//
// Fifteen places had already bypassed the scale to reach a caption size it
// did not define, four of them landing on 9px -- below every platform floor
// (iOS HIG says 11pt, Material's caption is 12sp). Large one-off display
// sizes are deliberate (the rating card's 52), so only the small end is
// policed.
const FLOOR = 10;
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const full = join(dir, e.name);
  if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(full);
  return /[.]tsx?$/.test(e.name) ? [full] : [];
});
console.log(String.fromCharCode(10) + 'raw font sizes below the scale floor:');
let tiny = 0;
for (const f of [...walk(join(ROOT, 'app/app')), ...walk(join(ROOT, 'app/src'))]) {
  readFileSync(f, 'utf8').split(String.fromCharCode(10)).forEach((line, i) => {
    const m = line.match(/fontSize: ([0-9]+)/);
    if (m && Number(m[1]) < FLOOR) {
      tiny++; bad++;
      console.log('  FAIL  ' + f.slice(ROOT.length + 1) + ':' + (i + 1) + '  fontSize: ' + m[1] + ' -- use fontSize.caption or larger');
    }
  });
}
if (!tiny) console.log('  none');

console.log(`\n${bad} problem(s).`);
process.exit(bad ? 1 : 0);
