/**
 * Post-generation article validator.
 * Scans article body for common AI writing markers and builds
 * a targeted fix prompt if violations are found.
 */

// Top AI-tell words/phrases that are mechanically detectable.
// Keep this list focused on the most egregious offenders.
const BANNED_WORDS = [
  'moreover',
  'furthermore',
  'additionally',
  'subsequently',
  'notably',
  'essentially',
  'ultimately',
  'firstly',
  'secondly',
  'thirdly',
  'delve',
  'delving',
  'multifaceted',
  'nuanced',
  'intricate',
  'comprehensive',
  'meticulous',
  'meticulously',
  'plethora',
  'myriad',
  'tapestry',
  'harness',
  'facilitate',
  'bolster',
  'illuminate',
  'underscore',
  'underscores',
  'embark',
  'revolutionize',
  'spearhead',
  'leverage',
  'navigate',
  'foster',
  'elevate',
  'elevating',
  'unlock',
  'unleash',
  'boasts',
  'vibrant',
  'nestled',
  'groundbreaking',
  'renowned',
  'showcasing',
  'exemplifies',
  'breathtaking',
  'stunning',
  'seamlessly',
  'seamless',
  'robust',
  'cutting-edge',
  'game-changer',
  'testament',
  'landscape',
  'realm',
  'profound',
  'pivotal',
  'dive into',
  'dive in',
];

// Phrases that commonly appear as paragraph openers in AI text
const BANNED_PARAGRAPH_OPENERS = [
  'moreover',
  'furthermore',
  'additionally',
  'however',
  'despite',
  'notably',
  'interestingly',
  'when it comes to',
  'in today\'s world',
  'in the realm of',
  'in the world of',
  'it is worth noting',
  'it\'s worth noting',
  'in conclusion',
  'to summarise',
  'to sum up',
  'as you can see',
  'as we\'ve seen',
  'all in all',
];

// Trailing significance patterns (present participle + significance claim)
const TRAILING_PATTERNS = [
  /,\s*making it (?:a |an |the )?\w+/gi,
  /,\s*cementing (?:its|their|the) /gi,
  /,\s*reflecting the /gi,
  /,\s*highlighting the /gi,
  /,\s*underscoring the /gi,
  /,\s*showcasing the /gi,
  /,\s*emphasizing the /gi,
  /,\s*solidifying (?:its|their|the) /gi,
  /,\s*contributing to (?:a |the )/gi,
];

interface ScanResult {
  violations: string[];
  count: number;
}

export function scanForViolations(body: string): ScanResult {
  const violations: string[] = [];
  const lowerBody = body.toLowerCase();

  // Check for em dashes
  const emDashCount = (body.match(/\u2014/g) || []).length;
  if (emDashCount > 0) {
    violations.push(`Found ${emDashCount} em dash(es). Replace ALL with commas, periods, or parentheses.`);
  }

  // Check for banned words
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lowerBody.match(regex);
    if (matches) {
      violations.push(`Banned word "${word}" appears ${matches.length} time(s). Rewrite those sentences.`);
    }
  }

  // Check paragraph openers
  const paragraphs = body.split(/\n\n+/);
  for (const para of paragraphs) {
    const trimmed = para.trim().toLowerCase();
    for (const opener of BANNED_PARAGRAPH_OPENERS) {
      if (trimmed.startsWith(opener)) {
        const preview = para.trim().substring(0, 60);
        violations.push(`Paragraph opens with banned word "${opener}": "${preview}..." Rewrite the opening.`);
        break;
      }
    }
  }

  // Check trailing significance patterns
  for (const pattern of TRAILING_PATTERNS) {
    const matches = body.match(pattern);
    if (matches) {
      for (const match of matches) {
        violations.push(`Trailing significance clause found: "...${match.trim()}". Remove or rewrite as a new sentence.`);
      }
    }
  }

  // Check for "Not only X, but also Y"
  const notOnlyMatches = body.match(/not only .{5,60}but also/gi);
  if (notOnlyMatches) {
    violations.push(`"Not only...but also" construction found ${notOnlyMatches.length} time(s). Rewrite.`);
  }

  return {
    violations,
    count: violations.length,
  };
}

export function buildFixPrompt(body: string, violations: string[]): string {
  return `You are an editor. The article below contains AI writing markers that MUST be fixed. Fix ONLY the specific violations listed. Do not change anything else.

VIOLATIONS TO FIX:
${violations.map((v, i) => `${i + 1}. ${v}`).join('\n')}

FIX RULES:
- Replace every em dash with a comma, period, or parentheses
- Replace every banned word with a natural, conversational alternative
- Rewrite any paragraph that opens with a banned transition word. Start with the subject or a concrete detail instead
- Remove trailing present-participle significance clauses. Either delete them or rewrite as a new sentence
- Rewrite "Not only X, but also Y" as two direct statements
- Keep the article's tone, structure, and meaning identical. Only fix the flagged issues.

ARTICLE TO FIX:
${body}

Return ONLY the corrected article body text. No JSON, no preamble, no explanation. Just the corrected markdown article text.`;
}
