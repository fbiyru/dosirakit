'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Send, Trash2, ExternalLink, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Article {
  id: string;
  focus_keyword: string;
  status: 'draft' | 'archived' | 'published';
  wp_post_url: string | null;
  created_at: string;
  article_content: { title: string | null; word_count: number | null }[] | null;
}

type StatusFilter = 'all' | 'draft' | 'archived' | 'published';

export default function ArchivePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadArticles(); }, []);

  async function loadArticles() {
    const supabase = createClient();
    const brandId = localStorage.getItem('activeBrandId');
    if (!brandId) return;

    const { data } = await supabase
      .from('articles')
      .select('id, focus_keyword, status, wp_post_url, created_at, article_content(title, word_count)')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (data) setArticles(data as Article[]);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    setDeleting(id);

    const supabase = createClient();
    const { error } = await supabase.from('articles').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      toast.success('Article deleted');
    }
    setDeleting(null);
  }

  async function handlePublish(id: string) {
    try {
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: id }),
      });

      if (!res.ok) throw new Error('Failed to publish');

      toast.success('Published to WordPress!');
      loadArticles();
    } catch {
      toast.error('Failed to publish');
    }
  }

  const filtered = articles
    .filter((a) => filter === 'all' || a.status === filter)
    .filter((a) =>
      !search || a.focus_keyword.toLowerCase().includes(search.toLowerCase())
    );

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
    { value: 'published', label: 'Published' },
  ];

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-text mb-6">Archive</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-1">
            {statusFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:bg-surface-alt'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keyword..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Articles */}
        {loading ? (
          <p className="text-text-muted text-center py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <p className="text-text-muted text-center py-8">
              {articles.length === 0
                ? 'No articles yet. Create your first one!'
                : 'No articles match your filters.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((article) => {
              const title = article.article_content?.[0]?.title;
              const wordCount = article.article_content?.[0]?.word_count;

              return (
                <Card key={article.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">
                      {title ?? article.focus_keyword}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={article.status as 'draft' | 'archived' | 'published'}>
                        {article.status}
                      </Badge>
                      {wordCount && (
                        <span className="text-xs text-text-muted">{wordCount} words</span>
                      )}
                      <span className="text-xs text-text-muted">
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                      {article.wp_post_url && (
                        <a
                          href={article.wp_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> WP
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/article/${article.id}/review`}>
                      <Button variant="ghost" className="px-2 py-1.5">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    {article.status !== 'published' && (
                      <Button
                        variant="ghost"
                        className="px-2 py-1.5"
                        onClick={() => handlePublish(article.id)}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="px-2 py-1.5 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(article.id)}
                      disabled={deleting === article.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
