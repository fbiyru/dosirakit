'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface SerpResult {
  position: number;
  url: string;
  title: string;
  description: string;
}

interface KeywordResearchCardProps {
  keyword: string;
  volume: number;
  kd: number;
  serp_results: SerpResult[];
}

function getKdColor(kd: number): string {
  if (kd < 30) return 'bg-green-100 text-green-700';
  if (kd < 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function getKdLabel(kd: number): string {
  if (kd < 30) return 'Easy';
  if (kd < 60) return 'Moderate';
  return 'Hard';
}

export function KeywordResearchCard({
  keyword,
  volume,
  kd,
  serp_results,
}: KeywordResearchCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface-alt border border-border rounded-xl p-4 my-2">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-medium text-text text-sm">{keyword}</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {volume.toLocaleString()} /mo
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKdColor(kd)}`}
        >
          KD {kd} — {getKdLabel(kd)}
        </span>
      </div>

      {serp_results.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors duration-200"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Top {serp_results.length} results
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {serp_results.map((result) => (
                <div
                  key={result.position}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className="text-text-muted font-mono w-5 shrink-0 text-right">
                    {result.position}.
                  </span>
                  <div className="min-w-0">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-dark font-medium flex items-center gap-1"
                    >
                      <span className="truncate">{result.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <p className="text-text-muted truncate">{result.url}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
