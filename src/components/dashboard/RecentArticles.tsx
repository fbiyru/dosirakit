'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Archive, Send, Play, Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Article {
  id: string;
  focus_keyword: string;
  status: 'draft' | 'archived' | 'published';
  created_at: string;
  article_content: { title: string | null }[] | null;
  article_angles: { selected: boolean }[] | null;
}

interface RecentArticlesProps {
  articles: Article[];
  wpConfigured: boolean;
}

const statusVariant: Record<string, 'draft' | 'archived' | 'published'> = {
  draft: 'draft',
  archived: 'archived',
  published: 'published',
};

function hasContent(article: Article): boolean {
  return (article.article_content?.length ?? 0) > 0;
}

function hasSelectedAngle(article: Article): boolean {
  return article.article_angles?.some((a) => a.selected) ?? false;
}

export function RecentArticles({ articles, wpConfigured }: RecentArticlesProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  async function handleDelete(articleId: string) {
    setDeletingId(articleId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;

      setRemovedIds((prev) => new Set(prev).add(articleId));
      setConfirmDeleteId(null);
      toast.success('Article deleted');
    } catch {
      toast.error('Failed to delete article');
    } finally {
      setDeletingId(null);
    }
  }

  const visibleArticles = articles.filter((a) => !removedIds.has(a.id));

  if (visibleArticles.length === 0) {
    return (
      <Card>
        <p className="text-text-muted text-center py-8">
          No articles yet. Create your first one!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="divide-y divide-border">
        {visibleArticles.map((article) => {
          const title = article.article_content?.[0]?.title;
          const contentExists = hasContent(article);
          const angleSelected = hasSelectedAngle(article);

          // Determine where "Continue" should go
          const continueHref = !angleSelected
            ? `/article/${article.id}/angles`
            : !contentExists
              ? `/article/${article.id}/story`
              : `/article/${article.id}/review`;

          return (
            <div
              key={article.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-surface-alt transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text truncate">
                  {title ?? article.focus_keyword}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusVariant[article.status]}>
                    {article.status}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    {new Date(article.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4">
                {contentExists ? (
                  <>
                    {/* Article has generated content — show View, Archive, Push to WP */}
                    <Link
                      href={`/article/${article.id}/review`}
                      className="p-2 text-text-muted hover:text-accent transition-colors rounded-lg hover:bg-surface-alt"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {article.status === 'draft' && (
                      <>
                        <Link
                          href={`/article/${article.id}/review`}
                          className="p-2 text-text-muted hover:text-accent transition-colors rounded-lg hover:bg-surface-alt"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </Link>
                        {wpConfigured && (
                          <Link
                            href={`/article/${article.id}/review`}
                            className="p-2 text-text-muted hover:text-accent transition-colors rounded-lg hover:bg-surface-alt"
                            title="Push to WP"
                          >
                            <Send className="w-4 h-4" />
                          </Link>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Article has no content yet — show Continue and Delete */}
                    <Link
                      href={continueHref}
                      className="p-2 text-text-muted hover:text-accent transition-colors rounded-lg hover:bg-surface-alt"
                      title="Continue"
                    >
                      <Play className="w-4 h-4" />
                    </Link>
                    {confirmDeleteId === article.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          className="text-xs px-2 py-1 h-auto text-text-muted"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs px-2 py-1 h-auto text-destructive hover:text-destructive"
                          onClick={() => handleDelete(article.id)}
                          disabled={deletingId === article.id}
                        >
                          {deletingId === article.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(article.id)}
                        className="p-2 text-text-muted hover:text-destructive transition-colors rounded-lg hover:bg-surface-alt"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
