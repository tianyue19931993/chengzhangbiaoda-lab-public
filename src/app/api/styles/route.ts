import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/styles - 获取所有风格列表
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('styles')
      .select('*')
      .order('id', { ascending: true });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      data: { styles: data ?? [] },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
