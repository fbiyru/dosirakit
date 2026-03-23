'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { RecentArticles } from '@/components/dashboard/RecentArticles';
import { PenLine, Archive, Settings } from 'lucide-react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const [brandName, setBrandName] = useState('');
  const [stats, setStats] = useState({ total: 0, published: 0, archived: 0, thisMonth: 0 });
  const [articles, setArticles] = useState<Array<{
    id: string;
    focus_keyword: string;
    status: 'draft' | 'archived' | 'published';
    created_at: string;
    article_content: { title: string | null }[] | null;
  }>>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const brandId = localStorage.getItem('activeBrandId');
      if (!brandId) return;

      // Load brand name
      const { data: brand } = await supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .single();

      if (brand) setBrandName(brand.name);

      // Load articles
      const { data: allArticles } = await supabase
        .from('articles')
        .select('id, focus_keyword, status, created_at, article_content(title)')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (allArticles) {
        setArticles(allArticles.slice(0, 5) as typeof articles);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        setStats({
          total: allArticles.length,
          published: allArticles.filter((a) => a.status === 'published').length,
          archived: allArticles.filter((a) => a.status === 'archived').length,
          thisMonth: allArticles.filter((a) => new Date(a.created_at) >= monthStart).length,
        });
      }
    }

    load();
  }, []);

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Welcome cell - wide */}
          <Card className="md:col-span-2">
            <h2 className="font-display text-2xl font-bold text-text">
              {getGreeting()}! Ready to cook up some content?
            </h2>
            {brandName && (
              <p className="text-text-muted mt-1">Working on {brandName}</p>
            )}
          </Card>

          {/* Quick action */}
          <Card className="flex items-center justify-center">
            <Link href="/article/new">
              <Button className="text-lg px-8 py-4">
                <PenLine className="w-5 h-5" />
                New Article
              </Button>
            </Link>
          </Card>
        </div>

        {/* Stats */}
        <StatsBar {...stats} />

        {/* Recent articles */}
        <div>
          <h3 className="font-display text-lg font-semibold text-text mb-3">
            Recent Articles
          </h3>
          <RecentArticles articles={articles} />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/archive">
            <Card className="hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3">
              <Archive className="w-5 h-5 text-accent" />
              <span className="font-medium text-text">View All Articles</span>
            </Card>
          </Link>
          <Link href="/onboarding">
            <Card className="hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3">
              <Settings className="w-5 h-5 text-accent" />
              <span className="font-medium text-text">Brand Settings</span>
            </Card>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
