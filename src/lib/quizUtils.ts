// src/lib/quizUtils.ts

/**
 * Converts kebab-case string to snake_case.
 * Example: "general-intelligence-reasoning" -> "general_intelligence_reasoning"
 */
export function kebabToSnakeCase(str: string): string {
  return str.replace(/-/g, '_');
}

/**
 * Formats a unit title by removing content within parentheses.
 * Example: "Static GK (Books, Awards, Important Days)" -> "Static GK"
 */
export function formatUnitTitleForQuiz(title: string | null | undefined): string {
    if (!title) return "Unit";
    return title.replace(/\s*\(.*?\)\s*/g, '').trim();
}

/**
 * Formats remaining seconds into MM:SS format.
 */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Re-use or import formatting functions from moduleData if preferred
export function formatModuleSlugToTitle(slug: string): string {
    if (!slug) return '';
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function formatUnitIdToTitle(unitId: string): string {
     if (!unitId) return '';
    // Find the actual title from data if possible, otherwise format
    // For now, just format the ID for simplicity in this component
    return unitId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export const formatSlugToTitle = (slug: string | null | undefined): string => {
  // 1. Handle edge cases: return empty string for null, undefined, or empty slug
  if (!slug) {
    return '';
  }

  // 2. Split the slug by the hyphen delimiter
  const words = slug.split('-');

  // 3. Capitalize the first letter of each word
  const titleCasedWords = words.map(word => {
    // Handle cases where a word might be empty (e.g., from double hyphens "--")
    if (word.length === 0) {
      return '';
    }
    // Capitalize the first letter and append the rest of the word
    return word.charAt(0).toUpperCase() + word.slice(1);
    // Optional: If you want the rest of the word to be lowercase (strict Title Case):
    // return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  // 4. Join the words back together with spaces
  // Filter out any empty strings that might have resulted from double hyphens
  return titleCasedWords.filter(Boolean).join(' ');
};