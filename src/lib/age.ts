// Come To Dubai is 21+: date-of-birth helpers shared by the sign-up form and the sign-up API.

export const MIN_AGE = 21;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The date of birth as YYYY-MM-DD, or null if it isn't a real date. */
export function dobIso(dob: { day: string; month: string; year: string }): string | null {
  const m = MONTHS.indexOf(dob.month) + 1, d = Number(dob.day), y = Number(dob.year);
  if (!m || !d || !y) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null; // e.g. 31 Feb
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Whole years old today for a YYYY-MM-DD date of birth. */
export function ageFrom(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}
