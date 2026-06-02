import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 获取项目列表
export async function GET(request: NextRequest) {
  try {
    console.log('📋 获取项目列表...');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户 ID' },
        { status: 400 }
      );
    }
    
    console.log(`👤 用户 ID: ${userId}`);
    console.log(`📊 限制: ${limit}, 偏移: ${offset}`);
    
    // 构建查询
    let query = supabase
      .from('projects')
      .select(`
        *,
        images (*),
        videos (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: projects, error, count } = await query;
    
    if (error) {
      console.error('❌ 查询项目失败:', error);
      return NextResponse.json(
        { success: false, error: `查询失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`✅ 找到 ${projects?.length || 0} 个项目`);
    
    return NextResponse.json({
      success: true,
      data: {
        projects: projects || [],
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('❌ 获取项目列表出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 创建新项目
export async function POST(request: NextRequest) {
  try {
    console.log('📝 创建新项目...');
    
    const body = await request.json();
    const { userId, title, style = 'pixar' } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户 ID' },
        { status: 400 }
      );
    }
    
    console.log(`👤 用户 ID: ${userId}`);
    console.log(`📺 标题: ${title || '(未命名)'}`);
    console.log(`🎨 风格: ${style}`);
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: title || null,
        style: style,
        status: 'uploading',
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ 创建项目失败:', error);
      return NextResponse.json(
        { success: false, error: `创建失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`✅ 项目创建成功: ${project.id}`);
    
    return NextResponse.json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error: any) {
    console.error('❌ 创建项目出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
