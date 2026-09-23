const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'for', 'how', 'i', 'in', 'is',
  'it', 'of', 'on', 'the', 'to', 'what', 'when', 'where', 'which', 'who',
  'why', 'with'
]);

const MATCH_THRESHOLD = 0.5;
const MAX_QUESTION_LENGTH = 500;

// Normalize punctuation and whitespace so equivalent questions produce the same tokens.
function normalizeQuestion(question) {
  return String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Keep only meaningful words; the matcher does not infer intent or use semantic search.
function tokenize(question) {
  return normalizeQuestion(question)
    .split(' ')
    .filter((token) => token && !STOP_WORDS.has(token));
}

function calculateScore(queryTokens, faq) {
  const faqTokens = new Set([
    ...tokenize(faq.question),
    ...(Array.isArray(faq.keywords) ? faq.keywords.flatMap(tokenize) : [])
  ]);
  const uniqueQueryTokens = [...new Set(queryTokens)];
  const overlap = uniqueQueryTokens.filter((token) => faqTokens.has(token));
  const score = uniqueQueryTokens.length ? overlap.length / uniqueQueryTokens.length : 0;

  return { score, overlapCount: overlap.length };
}

function findBestMatch(question, faqs) {
  const queryTokens = tokenize(question);

  if (!queryTokens.length) {
    return null;
  }

  const ranked = faqs
    .map((faq, index) => ({
      faq,
      index,
      ...calculateScore(queryTokens, faq)
    }))
    .filter((candidate) => candidate.overlapCount > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.overlapCount !== left.overlapCount) return right.overlapCount - left.overlapCount;
      return left.index - right.index;
    });
  const best = ranked[0];

  // The threshold prevents a weak overlap from being presented as a reliable answer.
  if (!best || best.score < MATCH_THRESHOLD) {
    return null;
  }

  return {
    faq: best.faq,
    score: best.score,
    overlapCount: best.overlapCount
  };
}

module.exports = {
  MATCH_THRESHOLD,
  MAX_QUESTION_LENGTH,
  calculateScore,
  findBestMatch,
  normalizeQuestion,
  tokenize
};
