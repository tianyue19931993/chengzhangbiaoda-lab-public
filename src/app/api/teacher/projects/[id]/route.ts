import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/teacher/projects/[id] - project detail for teacher
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*, styles(name)')
      .eq('id', numId)
      .single();

    if (error || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Get export logs
    const { data: logs } = await supabaseAdmin
      .from('export_logs')
      .select('*')
      .eq('project_id', numId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        project: { ...project, style_name: project.styles?.name ?? null },
        export_logs: logs ?? [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/teacher/projects/[id] - teacher updates (status, storyboard_image_url, video_url)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.status !== undefined) updates.status = body.status;
    if (body.storyboard_image_url !== undefined) updates.storyboard_image_url = body.storyboard_image_url;
    if (body.video_url !== undefined) updates.video_url = body.video_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    // Auto-set processing/completed timestamps
    if (updates.status === 'processing') updates.processing_at = new Date().toISOString();
    if (updates.status === 'completed') updates.completed_at = new Date().toISOString();

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', numId)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: { project } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
