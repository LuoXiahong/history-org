/**
 * Normalizes a person's name for duplicate detection.
 * Matches the logic used in extraction module for consistency.
 */
export function normalizePersonName(fullName: string): string {
  return fullName.trim().toLowerCase();
}
