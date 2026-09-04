# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read `matobev-mobile-app-flow/project/Matobev.dc.html` in full.** It is the current design: 87
screens, Barlow / Barlow Condensed, and all 16 animation keyframes. Read it top to bottom — don't
skim. Then **follow its imports**: open every file it pulls in (`_ds/`, `support.js`,
`app/assets/logo-mask.png`) before you start implementing.

> **The copy in this folder is stale as of 28 Aug 2026.** The live canvas has since been re-skinned
> off navy/gold onto the `_ds/` "Industry" palette — `--navy #1d2d3d`, `--paper #f2f2f3`, and
> `--gold` now holding the blue `#1B66C4`. The token *names* were kept through that change, so read
> them as roles rather than hues: `--gold` is not gold. The app in `app/` is built on the new
> palette; this HTML file still shows the old one. Re-export the bundle before trusting it.
>
> Note that the API used to fetch the live file caps at 256 KiB, and the canvas is ~304 KB — a
> straight fetch silently returns about 74 of the 87 screens. Export the zip instead.

> **Ignore `Matobev v2/v3/v4.dc.html`.** They are superseded drafts from an earlier round — the
> 23-screen flow from before either re-skin. An earlier version of this README named `v4` as the
> primary design; that was true when it was written and is not true now. They are kept only as
> history.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `matobev-mobile-app-flow/README.md` — this file
- `matobev-mobile-app-flow/project/` — the `Matobev Mobile App Flow` project files (HTML prototypes, assets, components)
