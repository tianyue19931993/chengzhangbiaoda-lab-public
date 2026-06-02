import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 获取用户信息
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = params.id;
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, role, created_at')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 更新用户信息（如名字）
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = params.id;
    const body = await request.json();
    const { name } = body;
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: '名字不能为空' },
        { status: 400 }
      );
    }
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
