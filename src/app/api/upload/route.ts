import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/upload - upload image and create project
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file       = formData.get('file')       as File | null;
    const childName  = (formData.get('childName') as string | null)?.trim() || '';
    const projectName = (formData.get('projectName') as string | null)?.trim() || '';
    const styleId    = (formData.get('styleId')    as string | null) || 'pixar';

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    if (!childName) return NextResponse.json({ success: false, error: 'Missing childName' }, { status: 400 });
    if (!projectName) return NextResponse.json({ success: false, error: 'Missing projectName' }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Only JPG, PNG, WEBP allowed' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Max 10MB' }, { status: 400 });
    }

    // Upload to storage
    const ext = file.name.split('.').pop() ?? 'jpg';
    const fileName = 'uploads/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;

    const { error: storageErr } = await supabaseAdmin.storage
      .from('original-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (storageErr) {
      return NextResponse.json({ success: false, error: 'Upload failed: ' + storageErr.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('original-images')
      .getPublicUrl(fileName);
    const uploadedImage = urlData.publicUrl;

    // Create project
    const { data: project, error: projectErr } = await supabaseAdmin
      .from('projects')
      .insert({
        child_name: childName,
        project_name: projectName,
        style_id: styleId,
        original_image_url: uploadedImage,
        status: 'pending',
      })
      .select()
      .single();

    if (projectErr || !project) {
      return NextResponse.json({ success: false, error: 'Create project failed: ' + (projectErr?.message ?? 'unknown') }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { projectId: project.id, originalImageUrl: uploadedImage, fileName },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
