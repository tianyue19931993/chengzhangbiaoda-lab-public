import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id]
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
      .select('*, styles(name), users(name, institution, activity_date, session_number, student_code)')
      .eq('id', numId)
      .single();

    if (error || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const result = {
      ...project,
      style_name: project.styles?.name ?? null,
      user_name:        project.users?.name ?? null,
      user_institution: project.users?.institution ?? null,
      user_activity_date: project.users?.activity_date ?? null,
      user_session_number: project.users?.session_number ?? null,
      user_student_code: project.users?.student_code ?? null,
    };

    return NextResponse.json({ success: true, data: { project: result } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/projects/[id]
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
    if (body.downloaded_at !== undefined) updates.downloaded_at = body.downloaded_at;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

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

// DELETE /api/projects/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('projects').delete().eq('id', numId);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: { message: 'Deleted' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
