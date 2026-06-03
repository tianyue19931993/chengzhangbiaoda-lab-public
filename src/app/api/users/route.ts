import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/users?name=张三
// 支持按名字模糊搜索 + 按日期筛选
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const date = searchParams.get('date'); // YYYY-MM-DD

    let query = supabaseAdmin
      .from('users')
      .select('id, student_code, name, institution, activity_date, session_number')
      .order('activity_date', { ascending: false })
      .order('session_number', { ascending: true });

    if (name && name.trim()) {
      query = query.ilike('name', `%${name.trim()}%`);
    }
    if (date) {
      query = query.eq('activity_date', date);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
