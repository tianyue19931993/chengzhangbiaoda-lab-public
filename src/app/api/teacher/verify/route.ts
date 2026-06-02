import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/teacher/verify
 * 验证老师端密码
 * Body: { password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ success: false, error: '请输入密码' }, { status: 400 });
    }

    // 从 tempshow 表读取密码（top 1）
    const { data, error } = await supabaseAdmin
      .from('tempshow')
      .select('techmima')
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('❌ 读取老师密码失败:', error);
      return NextResponse.json({ success: false, error: '系统错误，请联系管理员' }, { status: 500 });
    }

    if (password === data.techmima) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: '密码错误' }, { status: 401 });
    }
  } catch (err: any) {
    console.error('❌ 老师端验证异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
