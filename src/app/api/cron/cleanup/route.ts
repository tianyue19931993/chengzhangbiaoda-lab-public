import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteQiniuFiles, extractQiniuKey } from '@/lib/qiniu';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 分钟超时

/**
 * Vercel Cron Job: 每天凌晨 0 点执行
 * 删除超过 7 天的七牛云文件（原图、分镜图、视频）
 * 
 * 注意：不删除数据库记录，只清理七牛存储
 * projects 表和 users 表需要手动清理
 */

export async function GET(request: NextRequest) {
  // 验证是否来自 Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 也支持手动触发（带 secret 参数）
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret && secret !== cronSecret) {
    return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 401 });
  }

  try {
    // 计算 7 天前的日期
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`[Cleanup] 开始清理 ${cutoffDate} 之前的数据`);

    // 查询需要清理的项目
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('id, child_name, project_name, created_at, original_image_url, storyboard_image_url, video_url')
      .lt('created_at', cutoffDate + 'T00:00:00Z');

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要清理的数据',
        cutoffDate,
        deleted: { original: 0, storyboard: 0, video: 0 }
      });
    }

    console.log(`[Cleanup] 找到 ${projects.length} 个项目需要清理`);

    // 收集所有需要删除的七牛 key
    const keysToDelete: string[] = [];
    const stats = { original: 0, storyboard: 0, video: 0 };

    for (const p of projects) {
      if (p.original_image_url) {
        const key = extractQiniuKey(p.original_image_url);
        if (key) {
          keysToDelete.push(key);
          stats.original++;
        }
      }
      if (p.storyboard_image_url) {
        const key = extractQiniuKey(p.storyboard_image_url);
        if (key) {
          keysToDelete.push(key);
          stats.storyboard++;
        }
      }
      if (p.video_url) {
        const key = extractQiniuKey(p.video_url);
        if (key) {
          keysToDelete.push(key);
          stats.video++;
        }
      }
    }

    console.log(`[Cleanup] 准备删除 ${keysToDelete.length} 个文件:`, stats);

    // 批量删除七牛文件
    const result = await deleteQiniuFiles(keysToDelete);

    console.log(`[Cleanup] 删除完成: 成功 ${result.deleted}, 失败 ${result.failed.length}`);

    // 返回结果
    return NextResponse.json({
      success: true,
      cutoffDate,
      projectsScanned: projects.length,
      filesToDelete: keysToDelete.length,
      stats,
      deleted: result.deleted,
      failed: result.failed.slice(0, 10), // 只返回前 10 个失败记录
      failedCount: result.failed.length,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('[Cleanup] 执行失败:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// 支持 POST 请求（手动触发）
export async function POST(request: NextRequest) {
  return GET(request);
}
