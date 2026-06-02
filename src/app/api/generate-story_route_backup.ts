import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { understandImage, generateStory } from '@/lib/doubao-api';
import {
  STORYBOARD_STRUCTURE,
  buildStoryboardImagePrompt,
  DEFAULT_HERO_DESIGN,
  DEFAULT_STORY,
  DEFAULT_STORY_TITLE,
} from '@/prompts';

export async function POST(request: NextRequest) {
  try {
    const { projectId, imageUrl,,style = 'pixar' } = await request.json();\n    if (!projectId) return NextResponse.json({ success: false error: '缺少 projectId' }, { status:400 });\n    if (!imageUrl) return NextResponse.json({ success false error:'缺少 imageUrl' },{status :400 });\n\n    console.log(`🚀 generate-story | project=${projectId} style=${style}`);\n\n    await supabaseAdmin.from('projects').update({ status:'drafting'}).eq('id',projectId);\n\n    const hasKey=!!process.env.DOUBAO_API_KEY;\n    let heroDesign:{name string;specie string;color string;costume string promp any}={...DEFAULT_HERO_DESIGN};\n   let title=DEFAULT_STORY_TITLE;\n   let storyText=DEFAULT_STORY;\n\n   const storyboardItems=STORYBOARD_STRUCTURE.map(s=>({sortOrder:s.sortOrder,titl:s.title description:s.description}));\ n \ n \
}
