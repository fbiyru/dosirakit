import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, logo_url, created_at, brand_settings(site_url, onboarding_complete)')
    .order('created_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brands: data });
}

export async function POST(request: Request) {
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { name } = body;
  if (!name) {
    return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const { data, error } = await supabase
    .from('brands')
    .insert({ name, slug })
    .select('id, name, slug')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brand: data });
}
