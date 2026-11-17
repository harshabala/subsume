/** Year handling: unknown is null (never 0); pre-1800 years are valid (classic books, silent films). */
export const YEAR_UNKNOWN_LABEL = 'Year unknown';
export const MIN_VALID_YEAR = -3000;
export const MAX_VALID_YEAR = 2100;

/** Valid on input: null (unknown), a plausible integer year, or legacy 0 (normalised to null on write). */
export function isValidYear(y: unknown): y is number | null {
  if (y === null) return true;
  return typeof y === 'number' && Number.isInteger(y) && y >= MIN_VALID_YEAR && y <= MAX_VALID_YEAR;
}

/** Legacy 0 means unknown. */
export function normalizeYear(y: number | null | undefined): number | null {
  return typeof y === 'number' && y !== 0 && Number.isFinite(y) ? y : null;
}

/** Display text for a year, or null when unknown (callers show YEAR_UNKNOWN_LABEL as a designed gap). */
export function yearText(y: number | null | undefined): string | null {
  return typeof y === 'number' && y !== 0 ? String(y) : null;
}

/** Year text or the designed "Year unknown" gap. */
export function yearOrUnknown(y: number | null | undefined): string {
  return yearText(y) ?? YEAR_UNKNOWN_LABEL;
}
