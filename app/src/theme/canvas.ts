// How canvas measurements become React Native values.
//
// The design canvas (docs/design-handoff/matobev-mobile-app-flow/project/
// Matobev.dc.html) draws every screen inside a `.droid` frame that is 266x576
// CSS px. A real Android device is ~360x780 dp. So the canvas is a scaled-down
// rendering, and its raw px are NOT device px:
//
//   266 -> 360   ratio 1.353
//   576 -> 780   ratio 1.354
//
// EXCEPT that the brand deck describes the same design in device space -- it
// names a "welcome screen hero (full-bleed, ~360x310px)", a "browse/discover
// featured card (360x126px)" and an "upload flow preview (360x132px)". Those
// heights (310, 126, 132) appear *verbatim* in the canvas HTML. So the deck is
// quoting canvas px and writing 360 loosely for "full width", rather than
// giving a second, scaled set of numbers. There is only one set of numbers.
//
// That leaves a real ambiguity the canvas cannot settle on its own, so this is
// the ruling, applied everywhere rather than re-decided per screen:
//
//   1. LAYOUT IS PROPORTIONAL FIRST. Prefer flex, percentages and the spacing
//      tokens over any absolute value. The canvas is a spec for proportion and
//      hierarchy; it is not a pixel target on a device size it never rendered at.
//
//   2. TYPE MAPS ONTO THE SEMANTIC SCALE, not onto arithmetic. Take the canvas
//      size, multiply by CANVAS_SCALE, and land on the nearest `fontSize` step.
//      This is what the already-shipped screens do (the canvas's 8.5px kicker
//      is fontSize.caption, its 11.5px banner title is fontSize.bodyLg), and a
//      coherent scale matters more than matching a mockup's decimals. Never
//      introduce a raw font size to hit a canvas value exactly.
//
//   3. FIXED DIMENSIONS SCALE by CANVAS_SCALE and round -- icon boxes, avatars,
//      rings, bar heights, tab bars. Use `cx()` so the intent is visible and the
//      canvas value stays readable at the call site.
//
//   4. RADII AND SPACING snap to the `radii` / `spacing` tokens. The canvas uses
//      13/14/18px radii which are within a pixel of md/lg/xl once scaled; snap
//      rather than inventing steps.
//
//   5. TOUCH TARGETS DO NOT SCALE. The canvas draws its buttons 46px tall,
//      which cx() would turn into 62 -- noticeably oversized next to any other
//      Android app. A control's height is an ergonomic constant, not a
//      proportion of the screen: Material's minimum is 48dp and this app
//      already standardised on 52. Buttons, rows, tab bars and anything else
//      a finger lands on keep their platform size, and only the things around
//      them scale. The canvas is describing hierarchy there, not millimetres.
//
// The one thing never to do is mix conventions inside a screen -- a scaled ring
// beside an unscaled card is what makes a port look subtly wrong in a way that
// is hard to point at.

/** The canvas frame is 266x576; a device is ~360x780. */
export const CANVAS_SCALE = 360 / 266;

/**
 * Scale a canvas pixel value to device dp.
 *
 * Write `cx(64)` rather than `87`, so the canvas value stays legible at the
 * call site and a later reader can check it against the design without
 * reverse-engineering the arithmetic.
 */
export function cx(canvasPx: number): number {
  return Math.round(canvasPx * CANVAS_SCALE);
}
