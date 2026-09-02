// Relative timestamps.
//
// This existed as three byte-identical-ish copies -- (scout-tabs)/messages,
// messages, and notifications -- which had already drifted into two different
// output styles. A fourth copy was about to be written for the home screen's
// "a scout viewed you" banner, so it is one function now.
//
// Two styles, because the drift was actually a real distinction: a message
// list is dense and wants "2m" in a corner, while a notification reads as a
// sentence and wants "2m ago".
//
// Both now say "now" under a minute. The compact copies said "0m", which is
// not a duration anyone writes, and read as a rendering fault rather than as
// "just happened".
//
// Negative differences are clamped to "now" as well. Device clocks are not
// reliably correct -- a phone a few minutes fast against the server would
// otherwise render "-3m ago" on a message that just arrived.
export function timeAgo(iso: string, style: 'compact' | 'long' = 'long'): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return 'now';

  const suffix = style === 'long' ? ' ago' : '';
  if (mins < 60) return `${mins}m${suffix}`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h${suffix}`;

  return `${Math.floor(hours / 24)}d${suffix}`;
}

/**
 * Whole days from now until an ISO date, or null when there is no date.
 *
 * Floors at 0 rather than going negative: a deadline that has passed is
 * "closes 0d", not "closes -3d". Callers that need to distinguish expired
 * from closing-today should check the date itself.
 */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.ceil((then - Date.now()) / 86400000));
}
