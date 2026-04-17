'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Archive, Settings, LogOut, Globe, TrendingUp } from 'lucide-react';
import { BrandSwitcher } from './BrandSwitcher';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/opportunities', label: 'Opportunities', icon: TrendingUp },
  { href: '/archive', label: 'Archive', icon: Archive },
  { href: '/brand/site-profile', label: 'Site profile', icon: Globe },
  { href: '/settings', label: 'Brand Settings', icon: Settings },
];

interface SidebarProps {
  brands: { id: string; name: string; slug: string }[];
  activeBrandId: string | null;
  onBrandChange: (brandId: string) => void;
}

export function Sidebar({ brands, activeBrandId, onBrandChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-64 bg-surface border-r border-border h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard">
          <h1 className="font-display text-xl font-bold text-text">Dosirakit</h1>
          <p className="text-xs text-text-muted">Pack your content. Ship it fresh.</p>
        </Link>
      </div>

      {/* Brand switcher */}
      <div className="px-4 py-3 border-b border-border">
        <BrandSwitcher
          brands={brands}
          activeBrandId={activeBrandId}
          onBrandChange={onBrandChange}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-accent-light text-accent-dark'
                  : 'text-text-muted hover:text-text hover:bg-surface-alt'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-surface-alt transition-colors duration-200 w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
