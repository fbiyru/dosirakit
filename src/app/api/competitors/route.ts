import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/competitors?brand_id=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brand_id');
    if (!brandId) {
      return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ competitors: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/competitors
 * Body: { brand_id, url, name? }
 */
export async function POST(request: Request) {
  try {
    const { brand_id, url, name } = await request.json();
    if (!brand_id || !url) {
      return NextResponse.json(
        { error: 'brand_id and url are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let normalized: string;
    try {
      normalized = new URL(url).toString().replace(/\/$/, '');
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('competitors')
      .insert({ brand_id, url: normalized, name: name || null })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ competitor: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/competitors?id=...
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('competitors').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
