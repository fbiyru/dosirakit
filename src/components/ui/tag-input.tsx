'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  label?: string;
  hint?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export function TagInput({
  label,
  hint,
  value,
  onChange,
  placeholder = 'Type and press Enter',
  maxTags,
  className,
}: TagInputProps) {
  const [input, setInput] = useState('');

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = input.trim();
      if (tag && !value.includes(tag) && (!maxTags || value.length < maxTags)) {
        onChange([...value, tag]);
        setInput('');
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text mb-1.5">
          {label}
        </label>
      )}
      {hint && <p className="text-sm text-text-muted mb-1.5">{hint}</p>}
      <div
        className={cn(
          'flex flex-wrap gap-2 px-3 py-2 rounded-xl border border-border bg-surface focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors duration-200'
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-light text-accent-dark text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-accent transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] py-1 bg-transparent outline-none text-text placeholder:text-text-muted"
        />
      </div>
      {maxTags && (
        <p className="text-xs text-text-muted mt-1">
          {value.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}
