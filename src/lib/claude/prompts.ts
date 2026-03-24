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
  article: Article
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

  return `You are a skilled food blogger writing for ${brandSettings.site_name || 'a food blog'}.

BRAND VOICE & GUIDELINES:
- Tone: ${brandSettings.tone_and_voice || 'Warm and approachable'}
- Target audience: ${brandSettings.target_audience || 'General food enthusiasts'}
- Content rules: ${brandSettings.content_guidelines || 'None specified'}
- Always include: ${brandSettings.things_to_always_include || 'None specified'}
- Never include: ${brandSettings.things_to_never_include || 'None specified'}

ANTI-AI WRITING RULES (always follow these):
${ANTI_AI_RULES}

ARTICLE BRIEF:
- Focus keyword: "${article.focus_keyword}"
- Article type: ${angle.article_type}
- Angle/Direction: ${angle.title}
- Direction notes: ${angle.description}
- Target word count: ${brandSettings.default_word_count_min}–${brandSettings.default_word_count_max} words
${article.secondary_keywords?.length ? `- Secondary keywords (include naturally where they fit, but do NOT force them — the focus keyword is still primary): ${article.secondary_keywords.join(', ')}` : ''}
${article.user_notes ? `- Author's additional notes: ${article.user_notes}` : ''}
${storySection}
WRITE the full article. Then provide all metadata.

Respond ONLY with a valid JSON object. No preamble, no markdown fences:
{
  "title": "Full article H1 title",
  "slug": "url-friendly-slug",
  "body": "Full article in markdown. Use ## for H2 subheadings, ### for H3. Use **bold** for key terms. Focus keyword must appear in first 100 words, at least 2-3 subheadings, and naturally throughout.",
  "meta_title": "SEO title, max 60 characters, include focus keyword",
  "meta_description": "Conversational, first-person meta description. Lead with the answer or hook. Under 155 characters. Include the focus keyword naturally.",
  "category": "Best matching category from: ${brandSettings.content_categories?.join(', ') || 'General'}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "image_prompt": "Detailed AI image generation prompt for the featured image, based on this style: ${brandSettings.image_prompt_style || 'Professional food photography'}"
}`;
}
