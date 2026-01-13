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
  if (normalizedSpoken === normalizedExpected) return true;
  
  // Check if spoken contains the expected word
  if (normalizedSpoken.includes(normalizedExpected)) return true;
  
  // Check similarity for slight pronunciation differences
  const similarity = calculateSimilarity(normalizedSpoken, normalizedExpected);
  return similarity > 0.7; // 70% similarity threshold
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
