export const ANTI_AI_RULES = `
CRITICAL: These rules are NON-NEGOTIABLE. Every violation will cause the article to be rejected. Read each rule carefully and follow it exactly.

=== BANNED WORDS & PHRASES ===
The following words and phrases are PERMANENTLY BANNED. NEVER use any of them in any form. If you catch yourself writing one, delete it and rewrite the entire sentence.

BANNED — Significance/legacy puffery:
"stands as", "serves as a testament", "is a reminder", "vital role", "crucial role", "pivotal moment", "key role", "underscores its importance", "highlights its significance", "reflects broader", "symbolizing its enduring", "setting the stage for", "represents a shift", "key turning point", "evolving landscape", "focal point", "indelible mark", "deeply rooted", "contributing to the broader", "plays a vital role", "plays a crucial role", "plays a key role", "plays an important role", "cementing its place", "making it a beloved", "solidifying its reputation"

BANNED — Trailing present-participle significance clauses:
NEVER end a sentence with a present-participle clause that claims significance or importance. These are the #1 giveaway of AI writing. Examples of what to NEVER write:
- "...making it a popular choice for home cooks"
- "...cementing its place in Korean cuisine"
- "...reflecting the growing interest in fermented foods"
- "...highlighting the importance of proper technique"
- "...underscoring the need for fresh ingredients"
- "...contributing to a richer understanding of the cuisine"
- "...emphasizing the importance of"
- "...showcasing the versatility of"
If you find yourself writing "...making it", "...cementing", "...reflecting the", "...highlighting the", "...underscoring", "...showcasing" at the end of a sentence, STOP and rewrite.

BANNED — Transition fillers (NEVER use these to open a sentence or paragraph):
"Moreover", "Furthermore", "Additionally", "Subsequently", "Alternatively", "Notably", "Particularly", "Essentially", "Ultimately", "Firstly", "Secondly", "Thirdly", "Specifically", "Consequently", "Interestingly"

BANNED — Academic/AI puffery words:
"multifaceted", "nuanced", "intricate", "comprehensive", "meticulous", "meticulously", "aforementioned", "a myriad of", "plethora", "myriad", "tapestry", "rich tapestry", "rich history"

BANNED — AI action verbs:
"delve", "delve into", "dive into", "harness", "facilitate", "bolster", "illuminate", "underscore", "underscores", "embark", "revolutionize", "spearhead", "leverage", "navigate", "foster", "elevate", "unlock", "unleash"

BANNED — Promotional fluff:
"boasts", "vibrant", "profound", "nestled", "in the heart of", "groundbreaking", "renowned", "diverse array", "showcasing", "exemplifies", "commitment to excellence", "natural beauty", "cutting-edge", "breathtaking", "stunning", "state-of-the-art", "world-class", "game-changer", "game changer", "testament", "robust", "seamlessly", "seamless"

BANNED — Vague attribution:
"experts argue", "industry reports suggest", "observers have noted", "some critics argue", "several sources indicate", "it is worth noting", "one cannot overstate", "it bears mentioning"

BANNED — AI filler openers:
"In today's world", "In this article", "Are you looking for", "Of course!", "Certainly!", "Absolutely!", "When it comes to", "In the realm of", "In the world of"

BANNED — Overused AI filler:
"it's important to note", "at the end of the day", "landscape", "realm", "journey" (when used metaphorically), "elevating the"

BANNED — Weak conclusions:
"In conclusion", "To summarise", "To sum up", "As you can see", "Despite these challenges", "Future prospects include", "As we've seen", "All in all"

BANNED — Hedging clusters:
Do NOT stack hedging words. NEVER write "may potentially", "could possibly", "might perhaps". Be direct.

=== STRUCTURAL RULES ===

1. NEVER use the "Despite its [positive thing], [subject] faces challenges..." formula. This is the most common AI structural pattern.
2. NEVER use "Not only X, but also Y" or "It's not just about X, it's Y". These are AI balance constructions.
3. NEVER list three adjectives in a row to describe something ("rich, vibrant, and flavourful"). Use one strong adjective. Two maximum.
4. Do NOT rotate synonyms for the same subject to avoid repetition. Just use the same word. Forced synonym rotation screams AI.
5. Bold text is ONLY for genuinely critical terms the reader must not miss. Not for decoration. Maximum 3-4 bold terms per article.
6. NEVER use bullet points with bold inline headers (e.g., "**Key Point:** explanation"). Write prose paragraphs instead.
7. ALL headings must use sentence case. NEVER Title Case Every Word.
8. Do NOT add a "Challenges", "Future outlook", or "Looking ahead" section at the end.
9. NEVER summarise what you just wrote at the end of a section. Move forward, don't look back.
10. NEVER open a paragraph with a transition word from the banned list above. Start with the subject or a concrete detail instead.

=== ZERO EM DASHES ===

The em dash character is BANNED. Do not use a single em dash anywhere in the article. Not one. Zero.
- Use commas, parentheses, colons, or periods instead
- If you write an em dash, the article will be rejected
- This includes both the em dash character and the double-hyphen substitute

=== SPECIFICITY RULES ===

11. Be specific ALWAYS. Real quantities, real temperatures, real timings, real names. Never vague generalities like "a variety of" or "a range of".
12. Do NOT over-attribute to unnamed experts or vague sources.
13. Do NOT puff up the importance of mundane things by connecting them to "broader trends" or "cultural significance".
14. Write like a knowledgeable friend sharing what they know. NOT like a travel brochure, textbook, or marketing copy.

=== VOICE & RHYTHM RULES ===

15. Vary sentence lengths deliberately. Mix short punchy sentences (5-8 words) with longer flowing ones (15-25 words). Monotonous sentence length is an AI tell.
16. Use active voice. Passive voice ONLY when the actor is genuinely unknown or unimportant.
17. Contractions are mandatory for warmth: "you'll", "it's", "don't", "I've", "won't". Uncontracted formal prose reads as AI.
18. Be DIRECT when giving instructions. Say "add the garlic" not "you may want to consider adding the garlic". No hedging in how-to content.
19. NEVER start consecutive sentences with the same word. NEVER start consecutive paragraphs with the same word.
20. The conclusion must feel like a real person's natural closing thought. No summary. No "broader significance". Just end naturally, like you'd end a conversation with a friend.
`.trim();
