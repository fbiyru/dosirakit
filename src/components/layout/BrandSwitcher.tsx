'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface BrandSwitcherProps {
  brands: Brand[];
  activeBrandId: string | null;
  onBrandChange: (brandId: string) => void;
}

export function BrandSwitcher({ brands, activeBrandId, onBrandChange }: BrandSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? brands[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Single brand — just show name
  if (brands.length <= 1) {
    return (
      <div className="text-sm font-medium text-text truncate">
        {activeBrand?.name ?? 'No brand'}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 w-full text-sm font-medium text-text hover:text-accent transition-colors"
      >
        <span className="truncate">{activeBrand?.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-50 py-1">
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => {
                onBrandChange(brand.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                brand.id === activeBrandId
                  ? 'bg-accent-light text-accent-dark font-medium'
                  : 'text-text hover:bg-surface-alt'
              }`}
            >
              {brand.name}
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push('/brands/new');
              }}
              className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-surface-alt flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Brand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
