// Serves the privacy policy and terms as public web pages.
//
// Google Play requires a privacy policy URL in the store listing, and the app
// had none -- no https link anywhere in the codebase. Standing up a website
// for two documents is disproportionate, and an Edge Function already gives us
// a stable public URL on infrastructure that exists.
//
// The text comes from content.ts, generated from docs/privacy-policy.md and
// docs/terms-of-service.md by scripts/build-legal.mjs. docs/ stays the source
// of truth so the published page and the repo cannot drift into disagreeing
// about what we promise users.
//
// The first version read the .md files at runtime with Deno.readTextFile.
// That deployed cleanly and then returned 500 on every request, because Edge
// Functions bundle only imported modules and a sibling file is not one.
//
// Deployed with --no-verify-jwt: a privacy policy that requires a login to
// read is not a published privacy policy.

import { PRIVACY, TERMS } from './content.ts';

const PAGES: Record<string, { md: string; title: string }> = {
  privacy: { md: PRIVACY, title: 'Privacy Policy' },
  terms: { md: TERMS, title: 'Terms of Service' },
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A deliberately small markdown renderer covering exactly the syntax these two
// documents use: headings, bold, inline code, links, bullet lists, tables,
// blockquotes and rules. Pulling in a full markdown library for two known
// files would be more dependency than the job needs.
function render(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;
  let inQuote = false;
  let inTable = false;

  const inline = (t: string) =>
    esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  const closeQuote = () => { if (inQuote) { out.push('</blockquote>'); inQuote = false; } };
  const closeTable = () => { if (inTable) { out.push('</tbody></table>'); inTable = false; } };

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    const t = line.trim();

    if (!t) { closeList(); closeQuote(); closeTable(); continue; }

    if (t.startsWith('> ')) {
      closeList(); closeTable();
      if (!inQuote) { out.push('<blockquote>'); inQuote = true; }
      out.push(`<p>${inline(t.slice(2))}</p>`);
      continue;
    }
    closeQuote();

    if (/^---+$/.test(t)) { closeList(); closeTable(); out.push('<hr>'); continue; }

    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) { closeList(); closeTable(); const n = h[1].length; out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }

    if (t.startsWith('|')) {
      const cells = t.split('|').slice(1, -1).map((c) => c.trim());
      // The |---|---| separator row carries no content.
      if (cells.every((c) => /^-+$/.test(c))) continue;
      if (!inTable) {
        out.push('<table><thead><tr>' + cells.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
        inTable = true;
      } else {
        out.push('<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
      }
      continue;
    }
    closeTable();

    if (t.startsWith('- ')) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(t.slice(2))}</li>`);
      continue;
    }
    closeList();

    out.push(`<p>${inline(t)}</p>`);
  }
  closeList(); closeQuote(); closeTable();
  return out.join('\n');
}

const shell = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Matobev</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; background:#F4F6F9; color:#0B1220;
         font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
         display:flex; justify-content:center; padding:24px 16px 64px; }
  main { max-width:720px; width:100%; background:#fff; border-radius:16px; padding:32px 28px;
         box-shadow:0 8px 24px rgba(11,18,32,.08); }
  @media (prefers-color-scheme: dark) {
    body { background:#0A1628; color:#F5F7FA; }
    main { background:#131B2E; box-shadow:none; border:1px solid #22304A; }
    blockquote { background:#1B2537 !important; }
    th, td { border-color:#2A3A57 !important; }
    code { background:#1B2537 !important; }
  }
  h1 { font-size:26px; line-height:1.25; margin:0 0 6px; }
  h2 { font-size:19px; margin:32px 0 10px; }
  h3 { font-size:16px; margin:22px 0 8px; }
  p, li { line-height:1.65; font-size:15px; }
  ul { padding-left:22px; }
  hr { border:0; border-top:1px solid rgba(127,127,127,.25); margin:28px 0; }
  blockquote { background:#FFF8E1; border-left:3px solid #FFAB00; margin:20px 0;
               padding:12px 16px; border-radius:8px; }
  blockquote p { font-size:14px; margin:6px 0; }
  table { border-collapse:collapse; width:100%; margin:14px 0; font-size:14px; }
  th, td { text-align:left; padding:9px 10px; border:1px solid rgba(127,127,127,.28); }
  code { background:#EEF1F5; padding:2px 5px; border-radius:4px; font-size:13px; }
  a { color:#1A6DFF; }
  nav { margin-bottom:22px; font-size:14px; }
  nav a { margin-right:16px; }
</style></head>
<body><main>
<nav><a href="?doc=privacy">Privacy Policy</a><a href="?doc=terms">Terms of Service</a></nav>
${body}
</main></body></html>`;

Deno.serve((req) => {
  const url = new URL(req.url);
  // Accepts ?doc=privacy and a trailing path segment, so both /legal?doc=terms
  // and /legal/terms work -- store listings and in-app links tend to be
  // written differently and neither should 404.
  const seg = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const key = url.searchParams.get('doc') ?? (seg in PAGES ? seg : 'privacy');
  const page = PAGES[key] ?? PAGES.privacy;

  return new Response(shell(page.title, render(page.md)), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Cached, but briefly: a corrected policy should reach people the same
      // day rather than sitting stale in a CDN for a week.
      'cache-control': 'public, max-age=3600',
    },
  });
});
