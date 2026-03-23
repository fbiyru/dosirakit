'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { OnboardingData } from '../OnboardingWizard';
import { Check, X, Loader2 } from 'lucide-react';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function Step8WordPress({ data, updateData }: StepProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  async function testConnection() {
    if (!data.wp_site_url || !data.wp_username || !data.wp_app_password) {
      setTestResult('fail');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const cleanPassword = data.wp_app_password.replace(/\s/g, '');
      const auth = btoa(`${data.wp_username}:${cleanPassword}`);
      const url = `${data.wp_site_url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;

      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
      });

      setTestResult(res.ok ? 'success' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">WordPress Connection</h2>
      <p className="text-sm text-text-muted">
        Optional — you can skip this and set it up later in brand settings.
      </p>
      <Input
        label="WordPress site URL"
        value={data.wp_site_url}
        onChange={(e) => updateData({ wp_site_url: e.target.value })}
        placeholder="https://mamakimcooks.com"
      />
      <Input
        label="WordPress username"
        value={data.wp_username}
        onChange={(e) => updateData({ wp_username: e.target.value })}
        placeholder="admin"
      />
      <div>
        <Input
          label="WordPress Application Password"
          type="password"
          value={data.wp_app_password}
          onChange={(e) => updateData({ wp_app_password: e.target.value })}
          placeholder="xxxx xxxx xxxx xxxx"
        />
        <p className="text-xs text-text-muted mt-1">
          Create one in WordPress: Users → Profile → Application Passwords
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={testConnection}
          disabled={testing || !data.wp_site_url}
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>

        {testResult === 'success' && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="w-4 h-4" /> Connected!
          </span>
        )}
        {testResult === 'fail' && (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <X className="w-4 h-4" /> Connection failed
          </span>
        )}
      </div>
    </div>
  );
}
