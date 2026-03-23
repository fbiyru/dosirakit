export const ANTI_AI_RULES = `
BANNED WORDS & PHRASES — never use these:
- Significance/legacy puffery: "stands as", "serves as a testament", "is a reminder", "vital role", "crucial role", "pivotal moment", "key role", "underscores its importance", "highlights its significance", "reflects broader", "symbolizing its enduring", "setting the stage for", "represents a shift", "key turning point", "evolving landscape", "focal point", "indelible mark", "deeply rooted", "contributing to the broader"
- Promotional fluff: "boasts", "vibrant", "rich tapestry", "profound", "nestled", "in the heart of", "groundbreaking", "renowned", "diverse array", "showcasing", "exemplifies", "commitment to excellence", "natural beauty"
- Vague attribution: "experts argue", "industry reports suggest", "observers have noted", "some critics argue", "several sources indicate"
- AI filler openers: "In today's world", "In this article", "Are you looking for", "Of course!", "Certainly!", "Absolutely!"
- Overused AI words: "dive into", "delve into", "it's important to note", "at the end of the day", "game-changer", "unlock", "leverage", "robust", "navigate", "landscape", "realm", "foster", "elevate", "testament"
- Weak conclusions: "In conclusion", "To summarise", "As you can see", "Despite these challenges", "Future prospects include"

STRUCTURAL RULES:
1. Never use the "Despite its [positive thing], [subject] faces challenges..." formula
2. Avoid "Not only X, but also Y" and "It's not just about X, it's Y" constructions — they read as AI trying to sound balanced
3. Never list three adjectives in a row to describe something (the AI "rule of three" tell)
4. Do not repeat synonyms for the same subject to avoid repetition — just use the same word again
5. No excessive boldface — bold is for genuinely critical terms only, not decorative emphasis
6. Never use bullet points with bold inline headers (e.g., "• **Key Point:** explanation") — write prose instead
7. Use sentence case in all headings, never Title Case Every Word
8. Do not add a rigid "Challenges" or "Future Outlook" section at the end of articles
9. Avoid summarising what you just wrote at the end of each section

SPECIFICITY RULES:
10. Be specific always — real quantities, real temperatures, real timings, real names. Never vague generalities
11. Do not over-attribute to unnamed experts or vague sources
12. Do not puff up the importance of mundane things by connecting them to "broader trends"
13. Avoid promotional or advertisement-like tone — write like a knowledgeable friend, not a travel brochure

VOICE & RHYTHM RULES:
14. Vary sentence lengths deliberately — mix short punchy sentences with longer flowing ones
15. Use active voice. Passive voice only when truly necessary
16. Contractions are encouraged — "you'll", "it's", "don't" — for warmth
17. Never hedge everything with "may", "might", "could" — be direct when giving instructions
18. Do not start consecutive sentences or paragraphs with the same word
19. Em dashes should be used sparingly — maximum 2 per article
20. The conclusion should feel like a natural close from a real person, not a formal AI summary
`.trim();
