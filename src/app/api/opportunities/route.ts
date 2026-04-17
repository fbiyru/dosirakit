import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/opportunities?brand_id=xxx
 * Returns all saved opportunities for the brand.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand_id = searchParams.get('brand_id');

  if (!brand_id) {
    return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('brand_id', brand_id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ opportunities: data ?? [] });
}

/**
 * POST /api/opportunities
 * Body: { brand_id, items: [{ keyword, volume, kd, traffic_potential, opportunity_type }] }
 * Saves selected opportunities. Skips duplicates (same keyword + brand_id).
 */
export async function POST(request: Request) {
  try {
    const { brand_id, items } = await request.json();

    if (!brand_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'brand_id and items array are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch existing keywords to avoid duplicates
    const { data: existing } = await supabase
      .from('opportunities')
      .select('keyword')
      .eq('brand_id', brand_id);

    const existingKeywords = new Set(
      (existing ?? []).map((r) => r.keyword.toLowerCase())
    );

    const toInsert = items
      .filter(
        (item: { keyword: string }) =>
          !existingKeywords.has(item.keyword.toLowerCase())
      )
      .map((item: {
        keyword: string;
        volume: number;
        kd: number;
        traffic_potential: number;
        opportunity_type: string;
      }) => ({
        brand_id,
        keyword: item.keyword,
        volume: item.volume,
        kd: item.kd,
        traffic_potential: item.traffic_potential,
        opportunity_type: item.opportunity_type,
        status: 'new',
      }));

    if (toInsert.length === 0) {
      return NextResponse.json({ saved: 0, skipped: items.length });
    }

    const { error } = await supabase.from('opportunities').insert(toInsert);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved: toInsert.length, skipped: items.length - toInsert.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/opportunities
 * Body: { id, status }
 * Updates the status of a saved opportunity.
 */
export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const validStatuses = ['new', 'briefed', 'written', 'published'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('opportunities')
      .update({ status })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/opportunities
 * Body: { id }
 */
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('opportunities').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
