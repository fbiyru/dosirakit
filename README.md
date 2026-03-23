# Dosirakit 🍱
**Pack your content. Ship it fresh.**

An AI-powered content studio for food bloggers. Enter a keyword, pick a direction, get a publication-ready article — with SEO metadata, an image prompt, and one-click WordPress draft publishing.

Built with Next.js, Supabase, and Claude AI.

---

## Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** Anthropic Claude API
- **CMS:** WordPress REST API (via Application Passwords)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (recommended) — Hostinger shared hosting is not compatible with Next.js

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/your-username/dosirakit.git
cd dosirakit
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` (see `.env.example` for required keys).

### 3. Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration: copy `supabase/migrations/001_initial_schema.sql` into the Supabase SQL editor and execute
3. Create your user account via **Supabase Dashboard → Authentication → Users → Add User**
4. Copy your project URL and anon key into `.env.local`

### 4. WordPress (optional)

To enable one-click WordPress publishing:
1. In WordPress: **Users → Profile → Application Passwords → Add New**
2. Enter these credentials during the Dosirak onboarding wizard

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` and log in with the account you created in Supabase Auth.

---

## First-Time Use

1. Log in → you'll be taken through the onboarding wizard
2. Set up your brand voice, content rules, and WordPress connection
3. Click "New Article" on the dashboard to start creating

---

## Project Structure

See `CLAUDE.md` for full technical specification.
