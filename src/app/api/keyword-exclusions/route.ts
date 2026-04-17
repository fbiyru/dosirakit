import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand_id = searchParams.get('brand_id');
  if (!brand_id) {
    return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('keyword_exclusions')
    .select('id, keyword')
    .eq('brand_id', brand_id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exclusions: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const { brand_id, keyword } = await request.json();
    if (!brand_id || !keyword) {
      return NextResponse.json({ error: 'brand_id and keyword are required' }, { status: 400 });
    }
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('keyword_exclusions')
      .upsert({ brand_id, keyword }, { onConflict: 'brand_id,keyword' })
      .select('id, keyword')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('keyword_exclusions').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
