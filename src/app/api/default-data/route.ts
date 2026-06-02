import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/default-data
 * 获取 is_default=true 的默认数据，用于无 API 时降级展示
 */
export async function GET() {
  try {
    // 默认故事
    const { data: story } = await supabase
      .from('stories')
      .select('*')
      .eq('is_default', true)
      .limit(1)
      .single();

    // 默认角色设定
    const { data: hero } = await supabase
      .from('hero_designs')
      .select('*')
      .eq('is_default', true)
      .limit(1)
      .single();

    // 默认分镜（9 条）
    const { data: storyboard } = await supabase
      .from('storyboard_items')
      .select('*')
      .eq('is_default', true)
      .order('sort_order', { ascending: true });

    // 默认视频
    const { data: video } = await supabase
      .from('videos')
      .select('*')
      .eq('is_default', true)
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        story: story ?? null,
        hero: hero ?? null,
        storyboard: storyboard ?? [],
        video: video ?? null,
      },
    });
  } catch (error: any) {
    console.error('❌ 获取默认数据失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
