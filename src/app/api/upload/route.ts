import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateUploadToken, getQiniuKey, getPublicUrl } from '@/lib/qiniu';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload - 创建项目记录（前端应先直传七牛云再调此接口）
 * 也兼容旧模式：传入 file 则后端上传（不推荐，有大小限制）
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const childName   = (formData.get('childName')   as string | null)?.trim() || '';
    const projectName = (formData.get('projectName') as string | null)?.trim() || '';
    const styleId     = (formData.get('styleId')     as string | null) || 'pixar';
    const userId      = (formData.get('userId')      as string | null)?.trim() || null;
    const existingUrl = (formData.get('imageUrl')     as string | null)?.trim() || null;
    const file        = formData.get('file') as File | null;

    if (!childName) return NextResponse.json({ success: false, error: '请输入小朋友的名字' }, { status: 400 });
    if (!projectName) return NextResponse.json({ success: false, error: '请输入作品名称' }, { status: 400 });

    let uploadedImage = existingUrl;

    // 兼容旧模式：如果传了 file 且没有 imageUrl，走后端上传（有 Vercel 大小限制）
    if (file && !uploadedImage) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ success: false, error: '仅支持 JPG、PNG、WEBP 格式' }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: '文件大小不能超过 10MB' }, { status: 400 });
      }

      // 生成临时 ID 用于文件命名
      const tempId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ext = file.name.split('.').pop() ?? 'jpg';
      const qiniuKey = getQiniuKey('original', tempId, file.name);
      const token = generateUploadToken(qiniuKey);

      // 上传到七牛云
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('token', token);
      uploadFormData.append('key', qiniuKey);

      const uploadRes = await fetch('https://upload.qiniup.com', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '上传失败');
        return NextResponse.json({ success: false, error: '图片上传失败：' + errText }, { status: 500 });
      }

      uploadedImage = getPublicUrl(qiniuKey);
    }

    if (!uploadedImage) {
      return NextResponse.json({ success: false, error: '请提供图片' }, { status: 400 });
    }

    // 创建项目记录
    const { data: project, error: projectErr } = await supabaseAdmin
      .from('projects')
      .insert({
        child_name: childName,
        project_name: projectName,
        style_id: styleId,
        original_image_url: uploadedImage,
        status: 'pending',
        user_id: userId || undefined,
      })
      .select()
      .single();

    if (projectErr || !project) {
      return NextResponse.json({ success: false, error: '创建项目失败：' + (projectErr?.message ?? '未知错误') }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { projectId: project.id, originalImageUrl: uploadedImage },
    });
  } catch (err: any) {
    console.error('[upload] 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// GET - 获取七牛云上传凭证（前端直传用）
export async function GET() {
  try {
    const key = `original-images/${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}.jpg`;
    const token = generateUploadToken(key);
    const publicUrl = getPublicUrl(key);

    return NextResponse.json({
      success: true,
      data: { token, key, uploadUrl: 'https://upload.qiniup.com', publicUrl },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
