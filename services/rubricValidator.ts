
export const checkRubricQuality = (text: string): { isVague: boolean; reasons: string[] } => {
  // If no text (e.g. using file upload which isn't text-readable on frontend), skip check.
  if (!text || text.trim().length === 0) {
    return { isVague: false, reasons: [] };
  }

  const reasons: string[] = [];

  // Note: We formerly checked for explicit point values (10 pts, 20%, etc).
  // We have removed this strict check to better support "Requirements Lists" that have no numbers but are still valid criteria.
  // The AI service is now instructed to use equal weighting if points are missing.

  // 1. Vague language
  const vaguePhrases = [
    "demonstrates understanding",
    "adequate",
    "sufficient",
    "appropriate",
    "clear enough",
    "meets expectations"
  ];
  
  const lowerText = text.toLowerCase();
  const hasVaguePhrases = vaguePhrases.some(phrase => lowerText.includes(phrase));
  if (hasVaguePhrases) {
    reasons.push("Contains vague language");
  }

  // 2. Missing structure
  // Rubric is a single paragraph or list with no clear criteria separation.
  // Heuristic: If text is reasonably long (> 200 chars) but has very few newlines (< 3)
  const lineCount = text.split('\n').filter(line => line.trim().length > 0).length;
  if (text.length > 200 && lineCount < 3) {
    reasons.push("Missing clear structure");
  }

  return { isVague: reasons.length > 0, reasons };
};