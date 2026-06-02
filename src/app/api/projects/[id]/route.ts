import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// 获取项目详情
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const projectId = params.id;
    console.log(`📺 获取项目详情: ${projectId}`);
    
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        images (*),
        videos (*)
      `)
      .eq('id', projectId)
      .single();
    
    if (error || !project) {
      console.error('❌ 查询项目失败:', error);
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }
    
    console.log(`✅ 项目详情获取成功: ${project.title || '(未命名)'}`);
    
    return NextResponse.json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error: any) {
    console.error('❌ 获取项目详情出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 更新项目
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const projectId = params.id;
    console.log(`📝 更新项目: ${projectId}`);
    
    const body = await request.json();
    const { title, style, status } = body;
    
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (style !== undefined) updates.style = style;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();
    
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();
    
    if (error || !project) {
      console.error('❌ 更新项目失败:', error);
      return NextResponse.json(
        { success: false, error: `更新失败: ${error?.message}` },
        { status: 500 }
      );
    }
    
    console.log(`✅ 项目更新成功: ${projectId}`);
    
    return NextResponse.json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error: any) {
    console.error('❌ 更新项目出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 删除项目
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const projectId = params.id;
    console.log(`🗑️ 删除项目: ${projectId}`);
    
    // 删除项目（级联删除 images 和 videos）
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) {
      console.error('❌ 删除项目失败:', error);
      return NextResponse.json(
        { success: false, error: `删除失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`✅ 项目删除成功: ${projectId}`);
    
    return NextResponse.json({
      success: true,
      data: {
        message: '项目已删除',
      },
    });
  } catch (error: any) {
    console.error('❌ 删除项目出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
