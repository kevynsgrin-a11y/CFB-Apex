/** ESPN row dates, not fetch times, govern whether a claim may be displayed. */
export const ESPN_INJURY_MAX_AGE_DAYS = 14;
/** @param {string | null | undefined} asOf @param {number} nowMs */
export function isCurrentEspnInjury(asOf, nowMs) {
  if (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(asOf)) return false;
  const date = asOf.slice(0, 10);
  const at = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(at) || new Date(at).toISOString().slice(0, 10) !== date) return false;
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const day = Date.parse(`${today}T00:00:00Z`);
  return at <= day && day - at <= ESPN_INJURY_MAX_AGE_DAYS * 86_400_000;
}
/** @param {string | null} asOf @param {number} nowMs */
export function editorialResearchIsHistorical(asOf, nowMs) {
  return asOf == null || asOf < new Date(nowMs).toISOString().slice(0, 10);
}
