/**
 * Count the clips in the Azure container and write uploader/count.json.
 *
 * Runs in CI, never in the browser. That is the whole point: counting needs
 * List permission on the container, and a List-capable SAS shipped to visitors
 * would let anyone enumerate every contributor's filenames. Here the credential
 * lives in a GitHub secret and only the runner ever sees it.
 *
 * Env:
 *   AZ_ACCOUNT    storage account name        (e.g. matobevdata)
 *   AZ_CONTAINER  container name              (e.g. raw)
 *   AZ_LIST_SAS   SAS query string with Read+List, leading '?' optional
 *   AZ_ENDPOINT   optional base URL override (tests, Azurite)
 */
import fs from 'fs';
import path from 'path';

const account = process.env.AZ_ACCOUNT;
const container = process.env.AZ_CONTAINER;
let sas = process.env.AZ_LIST_SAS;

if (!account || !container || !sas) {
  console.error('Missing AZ_ACCOUNT, AZ_CONTAINER or AZ_LIST_SAS.');
  process.exit(1);
}
sas = sas.trim().replace(/^\?/, '');

// Only real contributions count. Anything the tooling drops in the container
// (connectivity probes, stray text files) must not inflate the public number.
const VIDEO = /\.(mp4|mov|mkv|avi|m4v|webm|mpg|mpeg|3gp|wmv|flv)$/i;

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

let marker = '';
let clips = 0, other = 0, bytes = 0, pages = 0;

do {
  const base = process.env.AZ_ENDPOINT ||
               `https://${account}.blob.core.windows.net`;
  const url = `${base}/${container}` +
              `?restype=container&comp=list&maxresults=5000` +
              (marker ? `&marker=${encodeURIComponent(marker)}` : '') +
              `&${sas}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    const code = /<Code>([^<]+)<\/Code>/.exec(body);
    console.error(`List Blobs failed: HTTP ${res.status} ${code ? code[1] : ''}`);
    if (res.status === 403) {
      console.error('The SAS needs Read + List on this container, and must not be expired.');
    }
    process.exit(1);
  }

  const xml = await res.text();
  pages++;

  for (const m of xml.matchAll(/<Blob>([\s\S]*?)<\/Blob>/g)) {
    const blob = m[1];
    const name = decode((/<Name>([\s\S]*?)<\/Name>/.exec(blob) || [, ''])[1]);
    const len = parseInt((/<Content-Length>(\d+)<\/Content-Length>/.exec(blob) || [, '0'])[1], 10);
    if (VIDEO.test(name)) { clips++; bytes += len; } else { other++; }
  }

  marker = decode((/<NextMarker>([\s\S]*?)<\/NextMarker>/.exec(xml) || [, ''])[1]);
} while (marker);

const out = path.join('uploader', 'count.json');
let previous = null;
try { previous = JSON.parse(fs.readFileSync(out, 'utf8')).collected; } catch (e) {}

// Never publish a number that goes backwards on a partial or failed listing --
// a counter that drops reads as data loss to whoever is watching it.
if (previous != null && clips < previous) {
  console.error(`Refusing to write ${clips}: lower than the published ${previous}.`);
  console.error('If clips were genuinely deleted, edit uploader/count.json by hand.');
  process.exit(1);
}

fs.writeFileSync(out, JSON.stringify({
  collected: clips,
  updated: new Date().toISOString()
}, null, 2) + '\n');

const gb = (bytes / 1024 / 1024 / 1024).toFixed(1);
console.log(`clips: ${clips}  (skipped ${other} non-video)  ${gb} GB  across ${pages} page(s)`);
console.log(previous === clips ? 'unchanged' : `changed: ${previous ?? '-'} -> ${clips}`);
