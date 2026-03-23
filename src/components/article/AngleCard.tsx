'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const typeColors: Record<string, string> = {
  recipe: 'bg-orange-50 text-orange-700',
  listicle: 'bg-blue-50 text-blue-700',
  'long-form guide': 'bg-purple-50 text-purple-700',
  'how-to tutorial': 'bg-green-50 text-green-700',
  'personal essay': 'bg-pink-50 text-pink-700',
  comparison: 'bg-cyan-50 text-cyan-700',
  'beginner guide': 'bg-teal-50 text-teal-700',
  'cultural explainer': 'bg-amber-50 text-amber-700',
  'meal prep guide': 'bg-lime-50 text-lime-700',
  'quick tips': 'bg-indigo-50 text-indigo-700',
};

interface AngleCardProps {
  id: string;
  title: string;
  description: string;
  articleType: string;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export function AngleCard({ id, title, description, articleType, onSelect, loading }: AngleCardProps) {
  const colorClass = typeColors[articleType.toLowerCase()] || 'bg-gray-50 text-gray-700';

  return (
    <Card className="flex flex-col h-full">
      <div className="flex-1">
        <Badge className={colorClass}>
          {articleType}
        </Badge>
        <h3 className="font-display text-lg font-semibold text-text mt-3 mb-2">
          {title}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <Button
          onClick={() => onSelect(id)}
          disabled={loading}
          className="w-full"
        >
          Select This Angle
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
