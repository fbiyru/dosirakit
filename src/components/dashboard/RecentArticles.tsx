'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Eye, Archive, Send } from 'lucide-react';

interface Article {
  id: string;
  focus_keyword: string;
  status: 'draft' | 'archived' | 'published';
  created_at: string;
  article_content: { title: string | null }[] | null;
}

interface RecentArticlesProps {
  articles: Article[];
}

const statusVariant: Record<string, 'draft' | 'archived' | 'published'> = {
  draft: 'draft',
  archived: 'archived',
  published: 'published',
};

export function RecentArticles({ articles }: RecentArticlesProps) {
  if (articles.length === 0) {
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
        {articles.map((article) => {
          const title = article.article_content?.[0]?.title;
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
                    <Link
                      href={`/article/${article.id}/review`}
                      className="p-2 text-text-muted hover:text-accent transition-colors rounded-lg hover:bg-surface-alt"
                      title="Push to WP"
                    >
                      <Send className="w-4 h-4" />
                    </Link>
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
