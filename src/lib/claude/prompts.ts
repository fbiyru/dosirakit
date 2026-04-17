import { ANTI_AI_RULES } from '@/lib/constants/anti-ai-rules';

interface BrandSettings {
  site_name: string | null;
  target_audience: string | null;
  tone_and_voice: string | null;
  content_guidelines: string | null;
  things_to_always_include: string | null;
  things_to_never_include: string | null;
  default_word_count_min: number;
  default_word_count_max: number;
  content_categories: string[] | null;
  content_tags: string[] | null;
  image_prompt_style: string | null;
}

interface Angle {
  title: string;
  description: string;
  article_type: string;
}

interface Article {
  focus_keyword: string;
  secondary_keywords: string[] | null;
  user_notes: string | null;
  story_provided: boolean;
  story_content: string | null;
  story_placement: string | null;
  generate_image_prompts: boolean;
}

export function buildAnglesPrompt(
  brandSettings: BrandSettings,
  focusKeyword: string,
  userNotes: string | null
): string {
  return `You are a content strategist for ${brandSettings.site_name || 'a food blog'}, a food blog.

BRAND CONTEXT:
- Audience: ${brandSettings.target_audience || 'General food enthusiasts'}
- Tone & voice: ${brandSettings.tone_and_voice || 'Warm and approachable'}
- Content rules: ${brandSettings.content_guidelines || 'None specified'}
- Things to always include: ${brandSettings.things_to_always_include || 'None specified'}
- Things to never include: ${brandSettings.things_to_never_include || 'None specified'}

TASK:
Generate exactly 5 distinct article angles for the focus keyword: "${focusKeyword}"
${userNotes ? `Additional context from the author: ${userNotes}` : ''}

REQUIREMENTS:
- All 5 angles must be genuinely different in approach, structure, and search intent
- Must include at least 3 different article types from this list: listicle, recipe, long-form guide, how-to tutorial, personal essay, product/ingredient comparison, beginner guide, cultural explainer, meal prep guide, quick tips
- Each angle must target a distinct reader intent or audience segment
- Titles must be specific and enticing — no vague or generic clickbait
- Think about what would rank well for "${focusKeyword}" on Google

Respond ONLY with a valid JSON array. No preamble, no markdown fences. Example format:
[
  {
    "angle_number": 1,
    "title": "Article title here",
    "description": "2-3 sentences describing the angle, structure, and why it works for this keyword.",
    "article_type": "recipe"
  }
]`;
}

export function buildRedoAnglesPrompt(
  brandSettings: BrandSettings,
  focusKeyword: string,
  userNotes: string | null,
  previousAngles: Angle[],
  feedback: string
): string {
  const prevAnglesText = previousAngles
    .map((a, i) => `${i + 1}. [${a.article_type}] ${a.title} — ${a.description}`)
    .join('\n');

  return `You are a content strategist for ${brandSettings.site_name || 'a food blog'}, a food blog.

BRAND CONTEXT:
- Audience: ${brandSettings.target_audience || 'General food enthusiasts'}
- Tone & voice: ${brandSettings.tone_and_voice || 'Warm and approachable'}
- Content rules: ${brandSettings.content_guidelines || 'None specified'}
- Things to always include: ${brandSettings.things_to_always_include || 'None specified'}
- Things to never include: ${brandSettings.things_to_never_include || 'None specified'}

PREVIOUS ANGLES (the author rejected these):
${prevAnglesText}

AUTHOR'S FEEDBACK ON WHY THESE DIDN'T WORK:
${feedback}

TASK:
Generate 5 NEW and DIFFERENT article angles for the focus keyword: "${focusKeyword}"
${userNotes ? `Additional context from the author: ${userNotes}` : ''}

REQUIREMENTS:
- Do NOT repeat any of the previous angles or titles
- Address the author's feedback directly
- All 5 angles must be genuinely different in approach, structure, and search intent
- Must include at least 3 different article types
- Titles must be specific and enticing

Respond ONLY with a valid JSON array. No preamble, no markdown fences:
[
  {
    "angle_number": 1,
    "title": "Article title here",
    "description": "2-3 sentences describing the angle.",
    "article_type": "recipe"
  }
]`;
}

export function buildArticlePrompt(
  brandSettings: BrandSettings,
  angle: Angle,
  article: Article,
  brief?: BriefContext
): string {
  let storySection = '';
  if (article.story_provided && article.story_content) {
    const placementInstruction =
      article.story_placement === 'intro'
        ? 'Weave this into the opening of the article to hook the reader with a personal connection.'
        : article.story_placement === 'middle'
        ? 'Insert this as a natural break or supporting anecdote in the middle of the article.'
        : article.story_placement === 'end'
        ? 'Use this as a personal conclusion to close the article warmly.'
        : 'Place this story wherever it fits most naturally and has the most impact.';

    storySection = `
PERSONAL STORY TO INCLUDE (mandatory — this is the author's real voice):
${article.story_content}

Story placement: ${placementInstruction}

IMPORTANT: The personal story must feel seamlessly integrated — not dropped in as a separate block. Write it as if the author is speaking directly to the reader. Do not start the story section with "Personally," or "In my experience," — find a more natural transition.
`;
  }

  const imagePromptFields = article.generate_image_prompts ? `,
  "image_prompt": "Detailed AI image generation prompt for the blog featured image. Style: ${brandSettings.image_prompt_style || 'Professional food photography'}. Landscape orientation (16:9). Focus on the hero shot of the dish/subject. Should look editorial and appetising.",
  "image_prompt_pinterest": "AI image generation prompt optimised for Pinterest. Portrait orientation (2:3). Bold, eye-catching composition. Include text overlay space at the top or bottom. Bright, saturated colours. The image should stop a scroller mid-feed. Style: ${brandSettings.image_prompt_style || 'Professional food photography'}.",
  "image_prompt_social": "AI image generation prompt optimised for Instagram/TikTok. Square (1:1) or vertical (4:5) format. Lifestyle-oriented, show the dish in context (hands, table setting, cooking process). Warm, inviting, shareable aesthetic. Style: ${brandSettings.image_prompt_style || 'Professional food photography'}."` : '';

  return `You are a skilled food blogger writing for ${brandSettings.site_name || 'a food blog'}.

BRAND VOICE & GUIDELINES:
- Tone: ${brandSettings.tone_and_voice || 'Warm and approachable'}
- Target audience: ${brandSettings.target_audience || 'General food enthusiasts'}
- Content rules: ${brandSettings.content_guidelines || 'None specified'}
- Always include: ${brandSettings.things_to_always_include || 'None specified'}
- Never include: ${brandSettings.things_to_never_include || 'None specified'}

ANTI-AI WRITING RULES — THIS IS THE HIGHEST PRIORITY CONSTRAINT. VIOLATIONS WILL CAUSE REJECTION:
${ANTI_AI_RULES}

ARTICLE BRIEF:
- Focus keyword: "${article.focus_keyword}"
- Article type: ${angle.article_type}
- Angle/Direction: ${angle.title}
- Direction notes: ${angle.description}
- Target word count: ${brandSettings.default_word_count_min}–${brandSettings.default_word_count_max} words
${article.secondary_keywords?.length ? `- Secondary keywords (include naturally where they fit, but do NOT force them — the focus keyword is still primary): ${article.secondary_keywords.join(', ')}` : ''}
${article.user_notes ? `- Author's additional notes: ${article.user_notes}` : ''}
${brief ? `
SEO BRIEF — use this to enrich your article. Follow the structure and weave in these targets naturally:
- Recommended title (adapt as needed to match your chosen angle): "${brief.recommended_title}"
- Long-tail variants to include naturally: ${brief.long_tail_variants.join(', ')}
- Semantic terms to weave throughout: ${brief.semantic_keywords.join(', ')}
- People Also Ask (consider addressing at least 2–3 of these within the article):
${brief.people_also_ask.map((q) => `  * ${q}`).join('\n')}
- Suggested heading structure (adapt to your angle — this is guidance, not a rigid script):
${brief.outline.map((s) => {
  const subs = s.subheadings?.length ? '\n' + s.subheadings.map((h) => `      H3: ${h}`).join('\n') : '';
  return `  ## ${s.heading} (~${s.word_allocation} words)\n     Notes: ${s.notes}${subs}`;
}).join('\n')}
${brief.internal_links.length > 0 ? `- Internal links to include where relevant (use exact anchor text where natural):\n${brief.internal_links.map((l) => `  * "${l.anchor_suggestion}" → ${l.url}`).join('\n')}` : ''}
- Writing guidance: ${brief.writing_notes}
` : ''}${storySection}

MANDATORY SELF-CHECK — complete every step before writing your final JSON response:
1. Scan your entire article for em dashes. Replace EVERY em dash with a comma, period, or parentheses. Zero em dashes allowed.
2. Scan for EVERY banned word and phrase from the ANTI-AI WRITING RULES above. If any appear, rewrite those sentences completely using different words.
3. Verify no paragraph opens with Moreover, Furthermore, Additionally, However, Despite, Notably, or When it comes to.
4. Check for three-adjective patterns before any noun. Cut to 1-2 adjectives maximum.
5. Remove any trailing present-participle clause that claims significance (e.g. "making it a popular choice", "cementing its place", "reflecting the growing trend").
6. Verify the conclusion does NOT summarise what you just wrote. End with a specific, personal, forward-looking thought.
7. Check that you have NOT used "Not only X, but also Y" or "It's not just about X, it's Y" anywhere.
8. Verify all headings use sentence case, not Title Case Every Word.

WRITE the full article. Then provide all metadata.

Respond ONLY with a valid JSON object. No preamble, no markdown fences:
{
  "title": "Full article H1 title",
  "slug": "url-friendly-slug",
  "body": "Full article in markdown. Use ## for H2 subheadings, ### for H3. Use **bold** for key terms. Focus keyword must appear in first 100 words, at least 2-3 subheadings, and naturally throughout.",
  "meta_title": "SEO title, max 60 characters, include focus keyword",
  "meta_description": "Conversational, first-person meta description. Lead with the answer or hook. Under 155 characters. Include the focus keyword naturally.",
  "category": "Best matching category from: ${brandSettings.content_categories?.join(', ') || 'General'}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]${imagePromptFields}
}`;
}

export interface BriefContext {
  recommended_title: string;
  long_tail_variants: string[];
  people_also_ask: string[];
  outline: Array<{
    heading: string;
    subheadings?: string[];
    notes: string;
    word_allocation: number;
  }>;
  semantic_keywords: string[];
  internal_links: Array<{ url: string; anchor_suggestion: string }>;
  writing_notes: string;
}

interface BriefInput {
  keyword: string;
  volume: number | null;
  kd: number | null;
  opportunity_type: string;
}

/**
 * Build the prompt used by /api/briefs to generate a full content brief.
 * Uses the opportunity keyword, brand context, site map (for internal linking),
 * competitor list, and voice profile.
 */
export function buildBriefPrompt(
  brandSettings: BrandSettings,
  opportunity: BriefInput,
  existingUrls: string[] | null,
  competitors: string[]
): string {
  const urlList =
    existingUrls && existingUrls.length > 0
      ? existingUrls.slice(0, 100).join('\n')
      : 'No URL map available.';

  const competitorList =
    competitors.length > 0 ? competitors.join(', ') : 'None specified.';

  return `You are an SEO content strategist building a detailed writing brief for ${brandSettings.site_name || 'a food blog'}.

BRAND CONTEXT:
- Site name: ${brandSettings.site_name || 'Unknown'}
- Audience: ${brandSettings.target_audience || 'General food enthusiasts'}
- Tone & voice: ${brandSettings.tone_and_voice || 'Warm and approachable'}
- Content rules: ${brandSettings.content_guidelines || 'None specified'}
- Always include: ${brandSettings.things_to_always_include || 'None specified'}
- Never include: ${brandSettings.things_to_never_include || 'None specified'}
- Default word count: ${brandSettings.default_word_count_min}–${brandSettings.default_word_count_max} words
- Content categories: ${brandSettings.content_categories?.join(', ') || 'Not set'}

TARGET KEYWORD:
- Primary keyword: "${opportunity.keyword}"
- Monthly search volume: ${opportunity.volume ?? 'Unknown'}
- Keyword difficulty: ${opportunity.kd ?? 'Unknown'}
- Opportunity type: ${opportunity.opportunity_type.replace(/_/g, ' ')}

COMPETITOR DOMAINS: ${competitorList}

EXISTING SITE URLS (for internal link suggestions):
${urlList}

TASK:
Generate a comprehensive content brief that a writer can use to produce a high-ranking, on-brand article for "${opportunity.keyword}".

Respond ONLY with a valid JSON object. No preamble, no markdown fences. Schema:
{
  "primary_keyword": "${opportunity.keyword}",
  "long_tail_variants": ["4-6 long-tail keyword variations that target related search intent"],
  "people_also_ask": ["3-5 real 'People Also Ask' questions relevant to the keyword"],
  "recommended_title": "A specific, enticing H1 title for the article",
  "outline": [
    {
      "heading": "H2 heading text in sentence case",
      "subheadings": ["Optional H3 subheadings under this section"],
      "notes": "What this section should cover and approximately how many words",
      "word_allocation": 200
    }
  ],
  "target_word_count_min": ${brandSettings.default_word_count_min},
  "target_word_count_max": ${brandSettings.default_word_count_max},
  "semantic_keywords": ["8-12 semantically related terms to include naturally throughout"],
  "internal_links": [
    {
      "url": "A URL from the site's existing pages that is relevant to this topic",
      "anchor_suggestion": "Suggested anchor text for the link"
    }
  ],
  "writing_notes": "2-4 sentences of tone and angle guidance specific to this brief, tied to the brand voice. What angle to take, what to avoid, and how to make this article stand out."
}`;
}

/**
 * Build the prompt used by /api/brand-voice/extract.
 * Given scraped site content, Claude returns a structured voice profile
 * covering tone, vocabulary, rhythm, POV, and 5 do's / 5 don'ts.
 */
export function buildVoiceExtractionPrompt(
  brandName: string,
  siteContent: string
): string {
  return `Analyse the following content from ${brandName}'s website and extract a detailed brand voice profile. Return a structured profile covering: tone and personality, vocabulary preferences (words they use / avoid), sentence rhythm and length patterns, point of view, and 5 specific writing do's and 5 don'ts based on the actual content. Be specific — cite patterns you observe, not generic advice.

Respond ONLY with a valid JSON object. No preamble, no markdown fences. Schema:
{
  "tone_and_personality": "2-4 sentences describing the overall tone, warmth, formality, and personality of the writing",
  "vocabulary_use": ["signature word or phrase 1", "signature word or phrase 2", "signature word or phrase 3", "signature word or phrase 4", "signature word or phrase 5"],
  "vocabulary_avoid": ["word or phrase clearly not in this voice 1", "word or phrase 2", "word or phrase 3", "word or phrase 4", "word or phrase 5"],
  "sentence_rhythm": "1-3 sentences on typical sentence length, rhythm, and variation observed",
  "point_of_view": "First person singular / first person plural / second person / third person — whichever you observe. Explain briefly.",
  "dos": ["specific do 1", "specific do 2", "specific do 3", "specific do 4", "specific do 5"],
  "donts": ["specific don't 1", "specific don't 2", "specific don't 3", "specific don't 4", "specific don't 5"]
}

Content:
${siteContent}`;
}
