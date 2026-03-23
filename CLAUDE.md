# Dosirakit — AI Content Studio
**Tagline:** Pack your content. Ship it fresh.

A branded AI content creation web app for food bloggers. Built for a single operator to produce SEO-optimised, brand-consistent articles using Claude AI, with direct WordPress draft publishing.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Styling | Tailwind CSS + custom design system |
| AI | Anthropic Claude API (`claude-sonnet-4-5-20251001`) |
| CMS Integration | WordPress REST API |
| Hosting | Vercel (recommended) |
| Language | TypeScript throughout |

### Hosting Note

**Use Vercel for this app** (free tier is sufficient for personal use). Hostinger shared hosting does not support Node.js servers and cannot run Next.js with API routes. Hostinger is better suited for the PHP/WordPress projects in this stack.

**If Hostinger VPS is preferred:** The app can be deployed on a Hostinger VPS running Node.js. Use `npm run build && npm start` with PM2 as a process manager, and Nginx as a reverse proxy. Set `PORT=3000` in the environment. This is more setup but fully viable.

**Vercel deployment (recommended path):**
1. Push repo to GitHub
2. Connect repo at vercel.com — it auto-detects Next.js
3. Add all env vars from `.env.example` in the Vercel dashboard
4. Deploy. Done. Every `git push` auto-deploys.

---

## App Name & Branding

- **App name:** Dosirakit (도시락 + kit — your content kit, packed and ready to go)
- **Aesthetic direction:** Editorial food magazine meets modern SaaS tool. Clean bento-grid layouts. Bold typographic headings. Warm accent palette. Cards with generous rounded corners. Mobile-first responsive.
- **Design system:**
  - **Fonts:** `Playfair Display` (headings/display), `DM Sans` (body/UI). Load from Google Fonts.
  - **Colors:**
    ```
    --color-bg: #FAFAF8 (warm off-white)
    --color-surface: #FFFFFF
    --color-surface-alt: #F4F1EC (warm cream for cards)
    --color-border: #E8E2D9
    --color-text: #1A1714 (near-black, warm)
    --color-text-muted: #7A7269
    --color-accent: #C8873A (saffron/turmeric — warm golden)
    --color-accent-light: #FDF3E7
    --color-accent-dark: #9E6520
    --color-success: #3A7D44
    --color-destructive: #C0392B
    --color-ink: #2C2420 (dark charcoal for article body)
    ```
  - Bento-style grid layouts on dashboard
  - Cards: `rounded-2xl`, subtle `shadow-sm`, `border border-[--color-border]`
  - Buttons: Filled (accent), outlined, ghost variants
  - All transitions: `duration-200 ease-in-out`
  - No purple gradients. No Inter. No generic AI aesthetics.

---

## Database Schema (Supabase / PostgreSQL)

Create these tables via Supabase migration. Place SQL in `supabase/migrations/001_initial_schema.sql`.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- brands (multi-brand ready, single brand UI for now)
create table public.brands (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  logo_url    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- brand_settings (all onboarding config lives here)
create table public.brand_settings (
  id                        uuid primary key default uuid_generate_v4(),
  brand_id                  uuid references public.brands(id) on delete cascade unique,
  -- Brand identity
  tone_and_voice            text,
  target_audience           text,
  brand_story               text,
  unique_selling_points     text,
  -- Content rules
  content_guidelines        text,     -- e.g. "halal-only, no pork, no alcohol"
  things_to_always_include  text,
  things_to_never_include   text,
  -- Defaults
  default_word_count_min    integer default 800,
  default_word_count_max    integer default 1200,
  -- Taxonomy
  content_categories        text[],
  content_tags              text[],
  -- SEO
  site_name                 text,
  site_url                  text,
  meta_description_style    text,
  -- Image AI prompts
  image_prompt_style        text,
  -- WordPress
  wp_site_url               text,
  wp_username               text,
  wp_app_password           text,
  -- Status
  onboarding_complete       boolean default false,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- articles (one record per creation session)
create table public.articles (
  id              uuid primary key default uuid_generate_v4(),
  brand_id        uuid references public.brands(id) on delete cascade,
  focus_keyword   text not null,
  user_notes      text,
  -- Personal story inputs (collected before generation)
  story_provided  boolean default false,
  story_content   text,         -- the raw personal anecdote the user types
  story_placement text,         -- where in the article: 'intro', 'middle', 'end', 'natural'
  status          text default 'draft' check (status in ('draft', 'archived', 'published')),
  wp_post_id      integer,
  wp_post_url     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- article_angles (5 angles generated per article session)
create table public.article_angles (
  id              uuid primary key default uuid_generate_v4(),
  article_id      uuid references public.articles(id) on delete cascade,
  angle_number    integer not null,
  title           text not null,
  description     text not null,
  article_type    text not null,  -- listicle, recipe, long-form, guide, essay, comparison, etc.
  selected        boolean default false,
  redo_round      integer default 1,
  created_at      timestamptz default now()
);

-- article_content (the generated article and all metadata)
create table public.article_content (
  id                  uuid primary key default uuid_generate_v4(),
  article_id          uuid references public.articles(id) on delete cascade,
  angle_id            uuid references public.article_angles(id),
  title               text,
  slug                text,
  body                text,         -- full article in markdown
  meta_title          text,
  meta_description    text,
  category            text,
  tags                text[],
  image_prompt        text,
  word_count          integer,
  version             integer default 1,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- RLS: Enable row level security on all tables
alter table public.brands enable row level security;
alter table public.brand_settings enable row level security;
alter table public.articles enable row level security;
alter table public.article_angles enable row level security;
alter table public.article_content enable row level security;

-- Policy: authenticated users can do everything (single-user app)
create policy "Authenticated full access" on public.brands for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.brand_settings for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.articles for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.article_angles for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.article_content for all using (auth.role() = 'authenticated');
```

---

## Environment Variables

Create `.env.local` (never commit this). Provide `.env.example` with all keys empty.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

WordPress credentials are stored per-brand in Supabase `brand_settings`, not in env.

---

## Project File Structure

```
dosirakit/
├── CLAUDE.md
├── README.md
├── .env.example
├── .env.local              ← not committed
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── src/
    ├── app/
    │   ├── layout.tsx                    ← Root layout, loads fonts
    │   ├── page.tsx                      ← Redirects: logged out → /login, logged in → /dashboard or /onboarding
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx              ← Login form
    │   └── (app)/
    │       ├── layout.tsx                ← Protected layout, checks auth
    │       ├── onboarding/
    │       │   └── page.tsx              ← Multi-step onboarding wizard
    │       ├── dashboard/
    │       │   └── page.tsx              ← Main dashboard
    │       ├── article/
    │       │   ├── new/
    │       │   │   └── page.tsx          ← Keyword + notes input
    │       │   └── [id]/
    │       │       ├── angles/
    │       │       │   └── page.tsx      ← Show 5 angles, select or redo
    │       │       ├── story/
    │       │       │   └── page.tsx      ← Personal story/anecdote collection
    │       │       ├── generate/
    │       │       │   └── page.tsx      ← Loading/generating state
    │       │       └── review/
    │       │           └── page.tsx      ← Article review + edit + publish
    │       └── archive/
    │           └── page.tsx              ← All past articles
    │       ├── brands/
    │       │   ├── new/
    │       │   │   └── page.tsx          ← Create a new brand (re-uses onboarding wizard)
    │       │   └── switch/
    │       │       └── page.tsx          ← Brand switcher (if >1 brand exists)
    └── api/
        ├── angles/
        │   └── route.ts                  ← POST: generate 5 angles
        ├── generate/
        │   └── route.ts                  ← POST: generate full article (streaming)
        ├── wordpress/
        │   └── route.ts                  ← POST: push draft to WP
        ├── redo-angles/
        │   └── route.ts                  ← POST: regenerate angles with feedback
        └── brands/
            └── route.ts                  ← GET: list brands, POST: create brand
    ├── components/
    │   ├── ui/                           ← Base UI components (button, card, input, badge, textarea, etc.)
    │   ├── layout/
    │   │   ├── AppShell.tsx              ← Sidebar + top nav wrapper
    │   │   ├── Sidebar.tsx
    │   │   ├── TopBar.tsx
    │   │   └── BrandSwitcher.tsx         ← Dropdown to switch active brand
    │   ├── onboarding/
    │   │   ├── OnboardingWizard.tsx      ← Step controller (used for both first brand and new brands)
    │   │   └── steps/                   ← One file per step
    │   ├── article/
    │   │   ├── AngleCard.tsx             ← Single angle display card
    │   │   ├── AngleGrid.tsx             ← 5-angle grid layout
    │   │   ├── StoryBrief.tsx            ← Personal story/anecdote collection form
    │   │   ├── ArticleEditor.tsx         ← Editable article body
    │   │   ├── MetaFields.tsx            ← Title, slug, meta desc fields
    │   │   ├── TagsField.tsx
    │   │   └── ImagePromptField.tsx
    │   └── dashboard/
    │       ├── RecentArticles.tsx
    │       └── StatsBar.tsx
    └── lib/
        ├── supabase/
        │   ├── client.ts                 ← Browser client
        │   └── server.ts                 ← Server client
        ├── claude/
        │   ├── prompts.ts                ← All Claude prompts as functions
        │   └── client.ts                 ← Anthropic SDK wrapper
        ├── wordpress/
        │   └── api.ts                    ← WP REST API helpers
        └── constants/
            └── anti-ai-rules.ts          ← Built-in writing quality rules
```

---

## Feature Specifications

### 1. Authentication — Login Page (`/login`)

- Email/password login via Supabase Auth
- Single user. No sign-up flow exposed in UI (user is created manually via Supabase dashboard or a one-time seed)
- After login: check how many brands exist for this user
  - 0 brands → redirect to `/onboarding`
  - 1 brand → set it as active brand in localStorage, redirect to `/dashboard`
  - 2+ brands → redirect to `/brands/switch` to pick which brand to work on
- Show the Dosirakit logo and tagline on login page
- Form: email input, password input, "Sign In" button
- Show error states clearly

---

### 1b. Brand Switcher (`/brands/switch`)

Shown when the user has more than one brand. Also accessible any time via the sidebar.

- Heading: "Which brand are you working on today?"
- Grid of brand cards — each shows brand name, site URL, and logo (if set)
- Click a card → sets `activeBrandId` in localStorage → redirect to `/dashboard`
- [+ Add New Brand] button → `/brands/new`
- The currently active brand is highlighted with an accent border

**Brand Switcher in the sidebar (always visible once 2+ brands exist):**
- Show active brand name + a small dropdown chevron
- On click: opens an inline dropdown listing all brands + "Add New Brand" option
- Switching brand updates `activeBrandId` in localStorage and refreshes dashboard data

**Active brand context:**
- All API calls, article creation, and dashboard data are scoped to `activeBrandId`
- Store `activeBrandId` in localStorage on the client. Pass it as a param to all API routes.
- On first load, if no `activeBrandId` is set, default to the first brand in the list.

---

### 1c. Create New Brand (`/brands/new`)

Re-uses the exact same `OnboardingWizard` component as the first-time onboarding, but:
- Page heading: "Set up a new brand"
- No "first time" welcome messaging
- On completion: creates a new `brands` + `brand_settings` record, sets it as the active brand, redirects to `/dashboard`
- The existing Mama Kim Cooks brand is untouched

---

### 2. Onboarding Wizard (`/onboarding`)

Multi-step wizard. Progress indicator at top. Previous/Next navigation. Final step saves everything to Supabase and marks `onboarding_complete = true`.

Auto-create a `brands` record and linked `brand_settings` record on first step completion.

**Steps:**

**Step 1 — Brand Identity**
- Brand name (text input) — prefill "Mama Kim Cooks"
- Blog/website URL (text input)
- Brand tagline (text input)
- Brand story / About (textarea) — prompt: "In 2-3 sentences, describe what your blog is about and who you are"

**Step 2 — Your Reader**
- Who is your target audience? (textarea) — prompt: "Who reads your blog? Age, interests, cooking level, what they're looking for"
- Where do your readers come from? (multi-select checkboxes: Search/Google, Social media, Word of mouth, Email newsletter, Other)

**Step 3 — Tone & Voice**
- How would you describe your writing style? (textarea) — prompt: "E.g. warm and maternal, like a friend teaching you to cook. Approachable, not pretentious."
- Adjectives that describe your brand voice (tag input — allow free typing, add up to 6 tags)
- Do you write in first person? (Yes / No / Sometimes toggle)

**Step 4 — Content Rules**
- Dietary/content restrictions (textarea) — prompt: "E.g. halal-only, no pork, no alcohol, no lard. Always note when a dish can be made vegetarian."
- Things to ALWAYS include in articles (textarea)
- Things to NEVER include or say (textarea)

**Step 5 — Content Structure**
- Default article word count range: min (number input, default 800) — max (number input, default 1200)
- Your main content categories (tag input — user types and adds) — prompt: "E.g. Korean Recipes, Meal Prep, Korean Pantry, Restaurant Reviews"
- Common tags you use (tag input)

**Step 6 — SEO Preferences**
- Meta description style (radio: "First-person, conversational" / "Third-person, descriptive" / "Question-led" / "I'll write my own")
- Anything specific about how you like your titles written? (textarea) — optional

**Step 7 — AI Image Prompts**
- Describe your preferred photo/image style (textarea) — prompt: "This will be used to generate AI image prompts for your articles. E.g. Close-up food photography, warm natural lighting, wooden table surface, Korean ceramics, vibrant colours, shallow depth of field."

**Step 8 — WordPress Connection**
- WordPress site URL (text input) — e.g. `https://mamakimcooks.com`
- WordPress username (text input)
- WordPress Application Password (password input) — show helper text: "Create one in WordPress → Users → Profile → Application Passwords"
- [Test Connection] button — calls the WP REST API to verify credentials before saving. Show success/fail state.
- This step is optional — user can skip and set up later in settings

**Step 9 — Review & Launch**
- Summary of all answers in read-only cards
- [Edit] button per section to jump back
- Big "Launch Dosirak 🚀" CTA button
- On click: save all to Supabase, redirect to `/dashboard`

---

### 3. Dashboard (`/dashboard`)

Bento-grid layout. Mobile: single column stack.

**Bento cells:**

- **Welcome cell** (wide): "Good morning, Rid. Ready to cook up some content?" — personalised greeting based on time of day. Show brand name.
- **Quick action cell**: Large CTA button "✍️ New Article" → `/article/new`
- **Stats row**: Total articles created / Published to WordPress / Archived / This month
- **Recent Articles** (table/card list): Last 5 articles with keyword, status badge, date, quick action links (View / Archive / Push to WP)
- **Archive shortcut cell**: "📦 View All Articles" → `/archive`
- **Brand settings shortcut**: "⚙️ Brand Settings" → `/onboarding` (re-editable)

---

### 4. New Article — Keyword Input (`/article/new`)

Clean, focused page. No distractions.

- Large heading: "What are we writing about today?"
- **Focus keyword** (text input, required) — label: "Focus Keyword or Topic", placeholder: "e.g. tteokbokki recipe, how to make kimchi at home"
- **Additional notes for AI** (textarea, optional) — label: "Anything else the AI should know?", placeholder: "e.g. I want this to be beginner-friendly. Target audience is non-Koreans curious about Korean food. Avoid making it sound too complicated."
- [Generate Angles →] button — on click: POST to `/api/angles`, then redirect to `/article/[id]/angles`
- Show loading state while generating (spinner + "Thinking up angles…")

---

### 5. Angles Page (`/article/[id]/angles`)

**Layout:** 5 angle cards in a responsive grid (2 columns desktop, 1 column mobile)

**Each angle card shows:**
- Article type badge (e.g. "Recipe", "Listicle", "Long-form Guide") — colour-coded
- Proposed article title (bold, large)
- 2-3 sentence description of the angle/direction
- [Select This Angle →] button

**Below the grid:**
- [🔄 Redo All Angles] button — opens a modal asking: "What didn't work? Your feedback helps us generate better options." with a textarea. On submit: POST to `/api/redo-angles` with feedback, regenerate, show new set. Keep track of redo round in DB.

On angle selection: mark that angle as `selected = true` in DB, redirect to `/article/[id]/story`

---

### 5b. Story Brief Page (`/article/[id]/story`)

This is a focused, single-purpose page that appears **after** angle selection and **before** generation. Its job is to collect any personal anecdotes, first-hand experiences, or specific details the user wants woven into the article.

**Why this step exists:** AI-generated content is generic by default. This step gives the author a structured moment to inject their real voice, personal memory, or unique experience before Claude writes the article — making the output feel authentically theirs.

**Page layout:** Clean, focused. No sidebar distraction. Progress indicator showing step 3 of 4 (Keyword → Angle → Your Story → Article).

**Content:**

- Heading: "Add your personal touch"
- Subheading: "Share a memory, experience, or detail only you could know. Claude will weave it naturally into your article."

**Three optional prompts shown as cards — user can fill in any or all:**

1. **Your experience with this topic**
   - Label: "Have you made this dish? Visited this place? Used this ingredient?"
   - Textarea placeholder: "e.g. The first time I made tteokbokki at home, I completely underestimated how spicy gochujang could get..."

2. **A specific detail or memory**
   - Label: "Any specific detail — a smell, a place, a person, a moment — that connects you to this topic?"
   - Textarea placeholder: "e.g. My mother-in-law taught me this technique when I visited Seoul in 2019. She insisted on using bronze chopsticks..."

3. **Anything unique to share with your readers**
   - Label: "A tip, a mistake you made, a cultural note — something your readers won't find elsewhere"
   - Textarea placeholder: "e.g. Most Western recipes skip the resting step entirely, but I've found that letting the dough sit for 20 minutes makes a huge difference..."

**Where to place the story:**
- Radio button group: "Where should this story appear?"
  - "At the start — hook the reader with my experience" (default)
  - "In the middle — as a natural break or supporting point"
  - "At the end — as a personal conclusion"
  - "Let Claude decide — place it wherever it fits best"

**Bottom actions:**
- [✍️ Generate Article →] — saves story inputs to `articles` record, redirects to `/article/[id]/generate`
- [Skip — generate without personal story] — skips with `story_provided = false`, goes straight to generate

**Important:** Even if all three fields are left blank and the user clicks Generate, treat it the same as Skip. Never block progress on this step.

---

### 6. Generate Page (`/article/[id]/generate`)

Full-screen loading state. No navigation. Calm, focused.

- Animated loader (CSS animation — e.g. rotating Korean pottery / simple elegant spinner in accent colour)
- Rotating messages every 3 seconds:
  - "Drafting your article…"
  - "Optimising for SEO…"
  - "Adding the finishing touches…"
  - "Almost ready…"
- POST to `/api/generate` on page load
- On success: redirect to `/article/[id]/review`
- On error: show error message with [Try Again] button

---

### 7. Review Page (`/article/[id]/review`)

The main output view. All sections are **directly editable inline**. 

**Layout (desktop):** Two-column — article body left (wider), metadata panel right (sticky)
**Layout (mobile):** Single column, metadata below article

**Left panel — Article Body:**
- Article title (editable `h1`-styled input)
- Word count badge (live, updates as user edits)
- Full article body — use a simple rich text / markdown editor (use `@uiw/react-md-editor` or similar lightweight option). User can edit directly.
- Auto-save to Supabase on blur or every 30 seconds

**Right panel — Metadata (sticky on desktop):**
Each field has a visible **[Copy]** button that copies the value to clipboard. Show a "Copied!" toast on copy.

Fields:
- **SEO Title** (editable input, char counter, max 60 chars)
- **Meta Description** (editable textarea, char counter, max 155 chars)  
- **URL Slug** (editable input)
- **Category** (dropdown from brand categories + option to type custom)
- **Tags** (tag input — pre-populated from AI suggestions, user can add/remove)
- **AI Image Prompt** (editable textarea with [Copy] button — this is for the user to use in Midjourney/Firefly etc.)

**Bottom action bar (sticky):**
- [💾 Archive Article] — sets status to 'archived', shows success toast, optionally redirect to `/archive`
- [🚀 Publish to WordPress + Archive] — calls `/api/wordpress`, then archives. Shows loading state. On success: shows WP draft link.

---

### 8. Archive (`/archive`)

Table/card list of all articles.

**Columns/fields shown:** Focus keyword, Article title, Status badge (draft/archived/published), Word count, Date created, WP link (if published)

**Filters:** Status filter (All / Draft / Archived / Published), Search by keyword

**Per article actions:** [View/Edit] → back to `/article/[id]/review` | [Push to WP] (if not yet published) | [Delete] (with confirm dialog)

---

## API Route Specifications

### `POST /api/angles`

**Request body:**
```json
{
  "focus_keyword": "string",
  "user_notes": "string",
  "brand_id": "uuid"
}
```

**Action:**
1. Fetch `brand_settings` for `brand_id`
2. Build prompt (see Prompts section)
3. Call Claude API
4. Parse JSON response
5. Create `articles` record, create 5 `article_angles` records
6. Return article_id + angles array

**Response:**
```json
{
  "article_id": "uuid",
  "angles": [
    {
      "id": "uuid",
      "angle_number": 1,
      "title": "string",
      "description": "string",
      "article_type": "string"
    }
  ]
}
```

---

### `POST /api/redo-angles`

**Request body:**
```json
{
  "article_id": "uuid",
  "feedback": "string"
}
```

**Action:** Same as `/api/angles` but includes previous angles and feedback in the prompt so Claude knows what to avoid. Saves as a new redo round.

---

### `POST /api/generate`

**Request body:**
```json
{
  "article_id": "uuid",
  "angle_id": "uuid"
}
```

**Action:**
1. Fetch article, selected angle, brand_settings
2. Build article generation prompt
3. Call Claude API (expect longer response — set `max_tokens: 4096`)
4. Parse JSON response
5. Save to `article_content`
6. Return content record

**Response:**
```json
{
  "content_id": "uuid",
  "title": "string",
  "slug": "string",
  "body": "string",
  "meta_title": "string",
  "meta_description": "string",
  "category": "string",
  "tags": ["string"],
  "image_prompt": "string",
  "word_count": 1050
}
```

---

### `POST /api/wordpress`

**Request body:**
```json
{
  "article_id": "uuid"
}
```

**Action:**
1. Fetch `article_content` and `brand_settings` (for WP credentials)
2. POST to `{wp_site_url}/wp-json/wp/v2/posts` with Basic Auth (base64 encode `username:app_password`)
3. Body: `{ title, content (HTML from markdown), status: "draft", slug, categories, tags }`
4. On success: update `articles.status = 'published'`, save `wp_post_id` and `wp_post_url`
5. Return WP post URL

**Note on auth:** Use `Authorization: Basic base64(username:app_password)` header. The app password includes spaces — remove them before encoding.

---

## Claude API Prompts

File: `src/lib/claude/prompts.ts`

### `buildAnglesPrompt(brandSettings, focusKeyword, userNotes)`

```
You are a content strategist for ${brandSettings.site_name}, a food blog.

BRAND CONTEXT:
- Audience: ${brandSettings.target_audience}
- Tone & voice: ${brandSettings.tone_and_voice}
- Content rules: ${brandSettings.content_guidelines}
- Things to always include: ${brandSettings.things_to_always_include}
- Things to never include: ${brandSettings.things_to_never_include}

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
]
```

### `buildArticlePrompt(brandSettings, angle, article)`

```
You are a skilled food blogger writing for ${brandSettings.site_name}.

BRAND VOICE & GUIDELINES:
- Tone: ${brandSettings.tone_and_voice}
- Target audience: ${brandSettings.target_audience}
- Content rules: ${brandSettings.content_guidelines}
- Always include: ${brandSettings.things_to_always_include}
- Never include: ${brandSettings.things_to_never_include}

ANTI-AI WRITING RULES (always follow these):
${ANTI_AI_RULES}

ARTICLE BRIEF:
- Focus keyword: "${article.focus_keyword}"
- Article type: ${angle.article_type}
- Angle/Direction: ${angle.title}
- Direction notes: ${angle.description}
- Target word count: ${brandSettings.default_word_count_min}–${brandSettings.default_word_count_max} words
${article.user_notes ? `- Author's additional notes: ${article.user_notes}` : ''}

${article.story_provided && article.story_content ? `
PERSONAL STORY TO INCLUDE (mandatory — this is the author's real voice):
${article.story_content}

Story placement: ${article.story_placement === 'intro' ? 'Weave this into the opening of the article to hook the reader with a personal connection.' : article.story_placement === 'middle' ? 'Insert this as a natural break or supporting anecdote in the middle of the article.' : article.story_placement === 'end' ? 'Use this as a personal conclusion to close the article warmly.' : 'Place this story wherever it fits most naturally and has the most impact.'}

IMPORTANT: The personal story must feel seamlessly integrated — not dropped in as a separate block. Write it as if the author is speaking directly to the reader. Do not start the story section with "Personally," or "In my experience," — find a more natural transition.
` : ''}

WRITE the full article. Then provide all metadata.

Respond ONLY with a valid JSON object. No preamble, no markdown fences:
{
  "title": "Full article H1 title",
  "slug": "url-friendly-slug",
  "body": "Full article in markdown. Use ## for H2 subheadings, ### for H3. Use **bold** for key terms. Focus keyword must appear in first 100 words, at least 2-3 subheadings, and naturally throughout.",
  "meta_title": "SEO title, max 60 characters, include focus keyword",
  "meta_description": "Compelling meta description, max 155 characters, include focus keyword naturally",
  "category": "Best matching category from: ${brandSettings.content_categories?.join(', ')}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "image_prompt": "Detailed AI image generation prompt for the featured image, based on this style: ${brandSettings.image_prompt_style}"
}
```

---

## Anti-AI Writing Rules (Built-in, Always Applied)

Sourced from Wikipedia's "Signs of AI Writing" field guide. Applied universally to every article regardless of brand.

File: `src/lib/constants/anti-ai-rules.ts`

```typescript
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
```

---

## WordPress Integration Notes

- Use WordPress **Application Passwords** (not the main account password)
- Encode as: `btoa('username:app_password_without_spaces')`
- Header: `Authorization: Basic {encoded}`
- Post as `status: "draft"` always — never auto-publish
- Convert markdown body to HTML before sending (use `marked` or `remark`)
- For categories/tags: first check if they exist via `GET /wp-json/wp/v2/categories?search=name`, create if not, then pass IDs

---

## UI Component Patterns

### Button variants
```tsx
// Primary (accent fill)
<button className="bg-[--color-accent] text-white px-6 py-3 rounded-xl font-medium hover:bg-[--color-accent-dark] transition-colors duration-200">

// Secondary (outlined)  
<button className="border border-[--color-border] text-[--color-text] px-6 py-3 rounded-xl font-medium hover:bg-[--color-surface-alt] transition-colors duration-200">

// Ghost
<button className="text-[--color-text-muted] px-4 py-2 rounded-lg hover:text-[--color-text] hover:bg-[--color-surface-alt] transition-colors duration-200">
```

### Card
```tsx
<div className="bg-white border border-[--color-border] rounded-2xl p-6 shadow-sm">
```

### Status badges
- Draft: `bg-gray-100 text-gray-600`
- Archived: `bg-amber-50 text-amber-700`
- Published: `bg-green-50 text-green-700`

### Copy button pattern
Every metadata field has a copy button:
```tsx
<button onClick={() => { navigator.clipboard.writeText(value); showToast('Copied!'); }}>
  Copy
</button>
```

---

## State & Navigation Flow

```
/login
  ↓ (auth success)
/                         ← checks brands count
  ↓ (0 brands)    ↓ (1 brand)        ↓ (2+ brands)
/onboarding    /dashboard          /brands/switch
  ↓ (complete)      ↑                    ↓ (brand selected)
/dashboard    ←——————————————————— /dashboard
  ↓
/article/new
  ↓ (keyword submitted)
/article/[id]/angles
  ↓ (angle selected)
/article/[id]/story          ← collect personal anecdote (skippable)
  ↓ (story saved or skipped)
/article/[id]/generate
  ↓ (generated)
/article/[id]/review
  ↓ (archived or published)
/archive

Brand management:
/brands/switch               ← pick active brand (accessible from sidebar)
/brands/new                  ← create new brand (re-uses OnboardingWizard)
```

---

## Package Dependencies

Install these:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install @uiw/react-md-editor          # Markdown editor for article body
npm install marked                          # Markdown → HTML for WP publishing
npm install react-hot-toast                # Toast notifications
npm install clsx tailwind-merge            # Class utilities
npm install lucide-react                   # Icons
```

---

## Implementation Order for Claude Code

Build in this sequence:

1. **Project scaffold** — Next.js app, Tailwind config, CSS variables, font imports
2. **Supabase setup** — client/server utils, migration SQL
3. **Auth** — login page, session middleware, route protection
4. **Onboarding wizard** — all 9 steps, save to Supabase (shared component used for both first brand and new brands)
5. **Multi-brand foundation** — `BrandSwitcher` component, `/brands/switch`, `/brands/new`, active brand context via localStorage
6. **Dashboard** — bento layout, stats, recent articles, brand-aware data fetching
7. **Anti-AI rules constant** — `anti-ai-rules.ts`
8. **Claude prompts** — `prompts.ts` with all prompt builders including story injection
9. **API routes** — `/api/angles`, `/api/redo-angles`, `/api/generate` (streaming), `/api/wordpress`, `/api/brands`
10. **New article flow** — keyword input page
11. **Angles page** — grid of 5 cards, selection, redo modal
12. **Story brief page** — three anecdote fields, placement selector, skip option
13. **Generate page** — streaming loading state with rotating messages
14. **Review page** — editable article + metadata panel + action bar
15. **Archive page** — table with filters
16. **Polish** — transitions, toasts, mobile responsiveness, empty states, error states

---

## Notes for Claude Code

- All Supabase calls from API routes should use the **service role client** (bypasses RLS). Client-side calls use the anon client with user session.
- Every query must be scoped to the active `brand_id`. Never return data across brands.
- Active brand is stored in `localStorage` as `activeBrandId`. All pages in the `(app)` layout should read this on mount and pass it to API calls.
- The `OnboardingWizard` component must be reusable — it's used at `/onboarding` (first brand setup) and `/brands/new` (additional brand). Accept a `brandId` prop: if null, create a new brand; if set, update existing.
- Never store WP app passwords in env. They live in Supabase `brand_settings` per brand — each brand has its own WP connection.
- The ANTHROPIC_API_KEY is only ever used server-side (API routes), never exposed to the browser.
- The `/api/generate` route must use **streaming** via Anthropic's streaming API and Next.js `StreamingTextResponse` or `ReadableStream`. This avoids Vercel's 10-second function timeout. The generate page consumes the stream and shows the article appearing word by word.
- Auto-save on the review page should debounce — save 2 seconds after user stops typing.
- Mobile breakpoint: `md:` prefix for two-column layouts. Everything stacks on mobile.
- Default brand name to pre-fill in onboarding Step 1: "Mama Kim Cooks"
- Story fields on the story brief page are all optional. If the user skips or leaves all fields blank, set `story_provided = false` and proceed to generation without story context in the prompt.
- The `BrandSwitcher` in the sidebar should only appear if the user has 2 or more brands. For a single brand, just show the brand name as static text.
