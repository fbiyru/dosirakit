'use client';

import { Card } from '@/components/ui/card';

interface StatsBarProps {
  total: number;
  published: number;
  archived: number;
  thisMonth: number;
}

export function StatsBar({ total, published, archived, thisMonth }: StatsBarProps) {
  const stats = [
    { label: 'Total Articles', value: total },
    { label: 'Published', value: published },
    { label: 'Archived', value: archived },
    { label: 'This Month', value: thisMonth },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(({ label, value }) => (
        <Card key={label} className="p-4 text-center">
          <p className="text-2xl font-bold text-text font-display">{value}</p>
          <p className="text-xs text-text-muted mt-1">{label}</p>
        </Card>
      ))}
    </div>
  );
}
