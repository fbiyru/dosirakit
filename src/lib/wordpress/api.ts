import { marked } from 'marked';

interface WPCredentials {
  wp_site_url: string;
  wp_username: string;
  wp_app_password: string;
}

interface ArticleContent {
  title: string;
  slug: string;
  body: string;
  category: string | null;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
}

function getAuthHeader(username: string, appPassword: string): string {
  const cleanPassword = appPassword.replace(/\s/g, '');
  return 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');
}

async function findOrCreateCategory(
  siteUrl: string,
  authHeader: string,
  name: string
): Promise<number | null> {
  if (!name) return null;

  const searchRes = await fetch(
    `${siteUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(name)}`,
    { headers: { Authorization: authHeader } }
  );

  if (searchRes.ok) {
    const categories = await searchRes.json();
    const existing = categories.find(
      (c: { name: string }) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing.id;
  }

  // Create new category
  const createRes = await fetch(`${siteUrl}/wp-json/wp/v2/categories`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (createRes.ok) {
    const created = await createRes.json();
    return created.id;
  }

  return null;
}

async function findOrCreateTags(
  siteUrl: string,
  authHeader: string,
  tagNames: string[]
): Promise<number[]> {
  const tagIds: number[] = [];

  for (const name of tagNames) {
    const searchRes = await fetch(
      `${siteUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(name)}`,
      { headers: { Authorization: authHeader } }
    );

    if (searchRes.ok) {
      const tags = await searchRes.json();
      const existing = tags.find(
        (t: { name: string }) => t.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        tagIds.push(existing.id);
        continue;
      }
    }

    // Create new tag
    const createRes = await fetch(`${siteUrl}/wp-json/wp/v2/tags`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      tagIds.push(created.id);
    }
  }

  return tagIds;
}

export async function publishToWordPress(
  credentials: WPCredentials,
  content: ArticleContent
): Promise<{ post_id: number; post_url: string }> {
  const siteUrl = credentials.wp_site_url.replace(/\/$/, '');
  const authHeader = getAuthHeader(credentials.wp_username, credentials.wp_app_password);

  // Convert markdown to HTML
  const htmlContent = await marked(content.body);

  // Resolve category and tags
  const categoryId = content.category
    ? await findOrCreateCategory(siteUrl, authHeader, content.category)
    : null;

  const tagIds = content.tags?.length
    ? await findOrCreateTags(siteUrl, authHeader, content.tags)
    : [];

  // Create the post as a draft
  const postBody: Record<string, unknown> = {
    title: content.title,
    content: htmlContent,
    status: 'draft',
    slug: content.slug,
  };

  if (categoryId) postBody.categories = [categoryId];
  if (tagIds.length) postBody.tags = tagIds;

  const res = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postBody),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`WordPress API error: ${res.status} — ${errorBody}`);
  }

  const post = await res.json();

  // Update RankMath SEO meta fields via post meta
  const rankMathMeta: Record<string, string> = {};
  if (content.meta_title) rankMathMeta['rank_math_title'] = content.meta_title;
  if (content.meta_description) rankMathMeta['rank_math_description'] = content.meta_description;
  if (content.focus_keyword) rankMathMeta['rank_math_focus_keyword'] = content.focus_keyword;

  if (Object.keys(rankMathMeta).length > 0) {
    const metaRes = await fetch(`${siteUrl}/wp-json/wp/v2/posts/${post.id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meta: rankMathMeta }),
    });

    if (!metaRes.ok) {
      console.warn('Failed to set RankMath meta fields:', await metaRes.text());
    }
  }

  return {
    post_id: post.id,
    post_url: post.link,
  };
}
