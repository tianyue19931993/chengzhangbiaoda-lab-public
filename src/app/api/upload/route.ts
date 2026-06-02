import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/upload
// 流程：保存图片 → 创建 project → 自动触发 generate-story
// 前端只需调用本接口，无需手动触发 AI 生成
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file       = formData.get('file')       as File | null;
    const userId     = formData.get('userId')     as string | null;
    const childName  = (formData.get('childName') as string | null)?.trim() || '小朋友';
    const styleId    = (formData.get('style')     as string | null) || 'pixar';

    if (!file) {
      return NextResponse.json({ success: false, error: '未找到上传文件' }, { status: 400 });
    }

    // ── 文件校验 ──────────────────────────────────────────
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: '只支持 JPG、PNG、WEBP 格式' }, { status: 400 });
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: '文件大小不能超过 10MB' }, { status: 400 });
    }

    // ── 用户（自动创建） ──────────────────────────────────
    const resolvedUserId = userId ?? crypto.randomUUID();
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', resolvedUserId)
      .single();

    if (!existing) {
      await supabaseAdmin.from('users').insert({
        id: resolvedUserId,
        name: childName,
        role: 'kid',
      });
    }

    // ── 上传图片到 Storage ────────────────────────────────
    const ext      = file.name.split('.').pop() ?? 'jpg';
    const fileName = `uploads/${resolvedUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: storageErr } = await supabaseAdmin.storage
      .from('original-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (storageErr) {
      console.error('❌ Storage 上传失败:', storageErr);
      return NextResponse.json({ success: false, error: `上传失败: ${storageErr.message}` }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('original-images')
      .getPublicUrl(fileName);
    const uploadedImage = urlData.publicUrl;

    // ── 创建项目记录 ─────────────────────────────────────
    const { data: project, error: projectErr } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id:        resolvedUserId,
        child_name:     childName,
        style_id:       styleId,
        uploaded_image: uploadedImage,
        status:         'drafting',
      })
      .select()
      .single();

    if (projectErr || !project) {
      console.error('❌ 创建项目失败:', projectErr);
      return NextResponse.json({ success: false, error: `创建项目失败: ${projectErr?.message}` }, { status: 500 });
    }

    console.log(`✅ 项目创建成功: ${project.id}，开始触发故事生成...`);

    // ── 同步创建 stories、hero_designs、storyboard_items ───────
    // ✅ 修复：上传时同步创建关联数据，避免详情页空数据
    try {
      // 创建 story 记录
      const { data: story } = await supabaseAdmin
        .from('stories')
        .insert({ project_id: project.id, content: '', status: 'draft' })
        .select()
        .single();

      // 创建 hero_design 记录
      const { data: hero } = await supabaseAdmin
        .from('hero_designs')
        .insert({ project_id: project.id, name: '张三', species: '人类', color: '蓝色', costume: '校服', prop: '书包' })
        .select()
        .single();

      // 创建 9 条 storyboard_items
      const storyboardTitles = ['英雄原本生活', '问题出现', '接受任务', '遇到困难', '获得帮助', '开始成长', '真相浮现', '最终挑战', '英雄归来'];
      const storyboardItems = storyboardTitles.map((title, i) => ({
        project_id: project.id,
        sort_order: i + 1,
        title,
        description: `第 ${i + 1} 幕：${title}`,
        prompt: '',
        image_url: null,
        status: 'pending',
      }));
      const { data: sbItems } = await supabaseAdmin
        .from('storyboard_items')
        .insert(storyboardItems)
        .select();

      console.log(`✅ 同步创建完成: story=${story?.id}, hero=${hero?.id}, storyboard_items=${sbItems?.length ?? 0} 条`);
    } catch (e: any) {
      console.error('⚠️ 同步创建关联数据失败（不影响主流程）:', e.message);
    }

    // ── 异步触发故事生成（不阻塞返回） ───────────────────
    // 前端收到 projectId 后立即跳转到详情页，AI 生成在后台进行
    // ✅ 修复：使用 Promise 但不 await，确保调用发出即可
    (async () => {
      try {
        // ✅ 从当前请求 URL 推断 baseUrl（Vercel 兼容）
        const urlObj = new URL(request.url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        const url = `${baseUrl}/api/generate-story`;
        console.log(`🚀 调用 generate-story: ${url}`);
        const resp = await fetch(url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ projectId: project.id, imageUrl: uploadedImage, style: styleId }),
        });
        const result = await resp.json();
        console.log(`✅ generate-story 触发成功:`, result);
      } catch (e: any) {
        console.error(`❌ 触发 generate-story 失败:`, e.message, e.stack);
      }
    })();

    return NextResponse.json({
      success: true,
      data: {
        projectId:      project.id,
        originalImageUrl: uploadedImage,
        fileName,
      },
    });
  } catch (err: any) {
    console.error('❌ /api/upload 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
