'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('activeBrandId');
    if (stored) setActiveBrandId(stored);

    async function loadBrands() {
      const supabase = createClient();
      const { data } = await supabase
        .from('brands')
        .select('id, name, slug')
        .order('created_at');

      if (data && data.length > 0) {
        setBrands(data);
        if (!stored) {
          setActiveBrandId(data[0].id);
          localStorage.setItem('activeBrandId', data[0].id);
        }
      }
    }

    loadBrands();
  }, []);

  const handleBrandChange = useCallback((brandId: string) => {
    setActiveBrandId(brandId);
    localStorage.setItem('activeBrandId', brandId);
    window.location.reload();
  }, []);

  return (
    <div className="flex h-screen bg-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          brands={brands}
          activeBrandId={activeBrandId}
          onBrandChange={handleBrandChange}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50">
            <Sidebar
              brands={brands}
              activeBrandId={activeBrandId}
              onBrandChange={handleBrandChange}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
