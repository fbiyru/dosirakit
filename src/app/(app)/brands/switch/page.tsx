'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Globe } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  slug: string;
  brand_settings: { site_url: string | null }[] | null;
}

export default function BrandSwitchPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setActiveBrandId(localStorage.getItem('activeBrandId'));

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('brands')
        .select('id, name, slug, brand_settings(site_url)')
        .order('created_at');

      if (data) setBrands(data);
    }
    load();
  }, []);

  function selectBrand(brandId: string) {
    localStorage.setItem('activeBrandId', brandId);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-text mb-2">
            Which brand are you working on today?
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {brands.map((brand) => {
            const siteUrl = brand.brand_settings?.[0]?.site_url;
            const isActive = brand.id === activeBrandId;
            return (
              <Card
                key={brand.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isActive ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => selectBrand(brand.id)}
              >
                <h2 className="font-display text-lg font-semibold text-text mb-1">
                  {brand.name}
                </h2>
                {siteUrl && (
                  <p className="text-sm text-text-muted flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    {siteUrl}
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            variant="secondary"
            onClick={() => router.push('/brands/new')}
          >
            <Plus className="w-4 h-4" />
            Add New Brand
          </Button>
        </div>
      </div>
    </div>
  );
}
