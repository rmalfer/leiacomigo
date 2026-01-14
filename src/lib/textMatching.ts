// Normalizes text for comparison (removes accents, punctuation, lowercase)
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .trim();
};

// Check if spoken word matches expected word
export const wordsMatch = (spoken: string, expected: string): boolean => {
  const normalizedSpoken = normalizeText(spoken);
  const normalizedExpected = normalizeText(expected);
  
  // Exact match
  if (normalizedSpoken === normalizedExpected) {
    console.log(`    ✓ Exact match`);
    return true;
  }
  
  // Only use fuzzy matching if words are similar in length
  // This prevents "desde" matching "vez", etc.
  const lengthDiff = Math.abs(normalizedSpoken.length - normalizedExpected.length);
  
  // For very short words (1-2 letters), allow more length difference but require high similarity
  if (normalizedExpected.length <= 2 && lengthDiff <= 2) {
    const similarity = calculateSimilarity(normalizedSpoken, normalizedExpected);
    if (similarity >= 0.6) {
      console.log(`    ✓ Short word match (${(similarity * 100).toFixed(0)}% similar)`);
      return true;
    }
  }
  
  // For normal words, require similar length and good similarity
  if (lengthDiff <= 2) {
    const similarity = calculateSimilarity(normalizedSpoken, normalizedExpected);
    if (similarity >= 0.8) {
      console.log(`    ✓ Fuzzy match (${(similarity * 100).toFixed(0)}% similar)`);
      return true;
    }
    console.log(`    ✗ No match (similarity: ${(similarity * 100).toFixed(0)}%, need 80%+)`);
  } else {
    console.log(`    ✗ No match (length diff: ${lengthDiff} chars)`);
  }
  
  // If lengths are very different, no match
  return false;
};

// Simple Levenshtein-based similarity
const calculateSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  const longerLength = longer.length;
  const editDistance = levenshteinDistance(longer, shorter);
  
  return (longerLength - editDistance) / longerLength;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Extract words from spoken text
export const extractWords = (text: string): string[] => {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0);
};
