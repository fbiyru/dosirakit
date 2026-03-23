'use client';

import { Menu } from 'lucide-react';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
      <button onClick={onMenuToggle} className="p-2 hover:bg-surface-alt rounded-lg transition-colors">
        <Menu className="w-5 h-5 text-text" />
      </button>
      <h1 className="font-display text-lg font-bold text-text">Dosirakit</h1>
      <div className="w-9" />
    </header>
  );
}
