/**
 * Normalizes company and builder names for deduplication.
 * Strips legal suffixes (Pvt Ltd, Private Limited, Corp), company descriptors,
 * and punctuation to produce a clean alphanumeric key.
 */
export function normalizeName(name: string): string {
  if (!name) return "";

  return name
    .toLowerCase()
    .replace(/^r\d+\s+/i, "")
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(
      /\b(pvt|ltd|private|limited|co|corp|corporation|inc|llp|group|builders|developers|constructions|construction|realty|real estate|enterprises|infratech|infra|housing|homes|structures|projects)\b/gi,
      "",
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Calculates string similarity ratio between two normalized names (0.0 to 1.0).
 */
export function calculateNameSimilarity(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  // Levenshtein distance similarity
  const lenA = normA.length;
  const lenB = normB.length;
  const matrix: number[][] = Array.from({ length: lenA + 1 }, () =>
    Array(lenB + 1).fill(0),
  );

  for (let i = 0; i <= lenA; i++) matrix[i]![0] = i;
  for (let j = 0; j <= lenB; j++) matrix[0]![j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = normA[i - 1] === normB[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  const distance = matrix[lenA]![lenB]!;
  const maxLen = Math.max(lenA, lenB);
  return 1 - distance / maxLen;
}
