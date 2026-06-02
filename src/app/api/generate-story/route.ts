import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { understandImage, generateStory, buildPrompts } from '@/lib/doubao-api';

/**
 * 默认故事数据（DOUBAO_API_KEY 未配置时降级使用）
 */
function getDefaultStoryData(style: string) {
  const theme = '勇气与成长';
  const hero_design = {
    name: '小星星',
    species: '小朋友',
    fur_color: '彩色',
    clothes: '画笔图案的T恤',
    item: '魔法画笔',
  };
  const storyboard = [
    { scene: 1, title: '英雄原本生活', description: '小星星每天在房间里画画，窗外阳光明媚' },
    { scene: 2, title: '问题出现',     description: '画里的彩虹猫突然眨了眼睛' },
    { scene: 3, title: '接受任务',     description: '彩虹猫邀请小星星一起飞上天空冒险' },
    { scene: 4, title: '遇到困难',     description: '乌云密布，风雨交加，彩虹猫飞不动了' },
    { scene: 5, title: '获得帮助',     description: '月亮婆婆送来一颗发光的星星宝石' },
    { scene: 6, title: '开始成长',     description: '小星星鼓起勇气，用画笔为彩虹猫注入能量' },
    { scene: 7, title: '真相浮现',     description: '原来只要相信魔法，画里的角色都会活过来' },
    { scene: 8, title: '最终挑战',     description: '面对最大的乌云怪，小星星和彩虹猫合力发射彩虹炮' },
    { scene: 9, title: '英雄归来',     description: '天空放晴，小星星回到房间，桌上多了一幅合影' },
  ];
  const story = `在一个充满魔法的小镇上，住着一个叫小星星的小朋友。小星星最喜欢画画了，每天都会用彩笔画出自己想象中的世界。

有一天，小星星画了一只会飞的猫咪！这只猫咪有着彩虹色的毛发，眼睛像两颗闪闪发光的宝石。当小星星对着画作许愿时，神奇的事情发生了——画中的猫咪竟然活了过来！

彩虹猫带着小星星飞上了天空，他们一起穿过了云朵城堡，拜访了月亮婆婆，还在星河里游了个泳。最后，彩虹猫告诉小星星："只要你保持想象力，我永远都会陪着你。"

从此以后，小星星的每一幅画都充满了魔法，而彩虹猫也成了小星星最好的朋友。`;

  // 根据风格生成默认 prompts
  const stylePrompts: Record<string, string[]> = {
    pixar: [
      'A cute child sitting at a desk drawing, warm sunny room, Pixar 3D animation style, bright colors, soft lighting, 16:9',
      'A rainbow-colored cat emerging from a drawing, glowing eyes, magic particles, Pixar 3D style, 16:9',
      'The rainbow cat fully alive, child surprised and happy, room filled with colorful light, Pixar 3D style, 16:9',
      'Rainbow cat carrying the child flying out the window, through clouds, blue sky and rainbow, dreamy scene, Pixar 3D style, 16:9',
      'Cloud castle made of soft white clouds with doors and towers, rainbow cat and little star flying toward it, Pixar 3D style, 16:9',
      'Inside the cloud castle, cotton candy furniture, kind moon grandmother welcoming them, warm atmosphere, Pixar 3D style, 16:9',
      'Star river scene, sparkling stars forming a glowing river, rainbow cat and little star swimming in it, beautiful dreamy, Pixar 3D style, 16:9',
      'Back on the ground, child sleeping peacefully, rainbow cat guarding by the pillow, moonlight through window, cozy and warm, Pixar 3D style, 16:9',
      'Child wakes up, finds a new drawing on the desk: a photo of themselves with rainbow cat, sunlight streaming in, happy smile, Pixar 3D ending, 16:9',
    ],
    guofeng: [
      '国画风格，小星星在书房作画，窗外竹影摇曳，水墨质感，16:9',
      '彩虹猫从画中走出，周身环绕祥云光芒，国风动画风格，16:9',
      '小星星骑上彩虹猫，腾云驾雾飞向天际，国风奇幻，16:9',
      '乌云翻滚，风雨欲来，国风水墨晕染效果，16:9',
      '月亮婆婆在月宫中递出一颗发光的夜明珠，国风唯美，16:9',
      '小星星提笔挥毫，金光从笔尖迸发，国画动态效果，16:9',
      '画卷中的世界缓缓展开，角色逐一活过来，国风奇幻，16:9',
      '最终决战，小星星与彩虹猫合力画出巨大凤凰，冲破乌云，国风壮观，16:9',
      '晨光洒进书房，桌上的画多了小星星和彩虹猫的合影，国风水墨余韵，16:9',
    ],
    anime: [
      '日式动漫风格，小星星在明亮的房间里画画，大眼睛闪闪发光，鲜艳色彩，16:9',
      '彩虹猫从画纸中跳出来，眼睛发光，动漫特效线条，16:9',
      '小星星骑着彩虹猫飞向天空，背景是梦幻的云海，二次元风格，16:9',
      '暴风雨来临，乌云密布，动漫风格暗色调，16:9',
      '月亮婆婆出现，周围漂浮着发光的星星，美少女战士风格，16:9',
      '小星星握紧画笔，眼神坚定，动漫风格高光效果，16:9',
      '真相揭示，所有画里的角色都活过来了，动漫梦幻场景，16:9',
      '最终对决，小星星和彩虹猫释放彩虹光线，动漫特效爆炸，16:9',
      '第二天早晨，小星星看着桌上的新画微笑，日式动漫温馨结尾，16:9',
    ],
    watercolor: [
      '水彩画风格，小星星在阳光房子里画画，色彩透明柔和，笔触自然，16:9',
      '彩虹猫从水彩画中浮现，颜色渐变柔和，水彩晕染效果，16:9',
      '小星星和彩虹猫飞过水彩天空，蓝紫色调渐变，水彩画质感，16:9',
      '乌云用水彩深蓝色表现，雨滴透明，水彩湿画效果，16:9',
      '月亮婆婆出现在水彩夜空，淡紫和金黄，水彩梦幻，16:9',
      '小星星用画笔点亮星空，水彩颜料在水中扩散效果，16:9',
      '画中的世界是水彩绘制的童话森林，色彩层次丰富，16:9',
      '最终挑战，水彩风格的巨大彩虹冲破黑暗云层，16:9',
      '清晨，水彩风格的阳光照进房间，桌上新画色彩柔和，温馨结尾，16:9',
    ],
    cyberpunk: [
      '赛博朋克风格，小星星在霓虹灯闪烁的房间里画画，全息投影，16:9',
      '彩虹猫从数字画板中走出，身体由光影和数据组成，赛博朋克，16:9',
      '小星星骑着彩虹猫飞过霓虹城市上空，赛博朋克夜景，16:9',
      '黑客病毒乌云笼罩城市，赛博朋克暗色调，紫色和黑色，16:9',
      'AI月亮婆婆在虚拟空间中送来数据宝石，赛博朋克科幻，16:9',
      '小星星用数字画笔重写代码，赛博朋克绿色代码雨效果，16:9',
      '真相：整个城市是一个巨大的VR画世界，赛博朋克哲学感，16:9',
      '最终决战，小星星和彩虹猫释放数字彩虹波，赛博朋克爆炸特效，16:9',
      '回到现实，小星星看着桌上的全息合影，赛博朋克温馨结尾，16:9',
    ],
  };

  const prompts = (stylePrompts[style] || stylePrompts.pixar).map(p =>
    p.replace(/Pixar 3D/g, style === 'pixar' ? 'Pixar 3D' : style)
  );

  return { title: `小星星与彩虹猫的冒险 (${getStyleLabel(style)})`, theme, hero_design, storyboard, story, prompts };
}

function getStyleLabel(style: string): string {
  return { pixar: 'Pixar 3D', guofeng: '国风', anime: '二次元', watercolor: '水彩', cyberpunk: '赛博朋克' }[style] || style;
}

/**
 * POST /api/generate-story
 * 完整流程：视觉理解 → 生成结构化故事 → 生成 9 条分镜 Prompt
 * 无 API Key 时降级使用默认数据，流程不中断
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, imageUrl, style = 'pixar' } = await request.json();
    if (!projectId) return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ success: false, error: '缺少 imageUrl' }, { status: 400 });

    console.log(`🚀 generate-story 开始 | project=${projectId} style=${style}`);

    // Step 1: 更新状态 → understanding
    await supabaseAdmin.from('projects').update({ status: 'understanding' }).eq('id', projectId);

    let storyObj: any;
    let prompts: string[];

    // 检测是否有豆包 API Key
    const hasKey = !!process.env.DOUBAO_API_KEY;

    if (hasKey) {
      console.log('🟢 使用豆包 API 生成故事');
      // Step 2: 豆包视觉理解
      const imageUnderstanding = await understandImage(imageUrl);
      console.log('🔍 视觉理解结果:', imageUnderstanding.slice(0, 100));

      // Step 3: 豆包 LLM 生成结构化故事
      storyObj = await generateStory(imageUnderstanding, style);
      console.log('📖 故事生成完成:', storyObj.title);

      // Step 4: 根据故事 + hero_design 生成 9 条 Prompt
      prompts = buildPrompts(storyObj, style);
    } else {
      console.log('🟡 DOUBAO_API_KEY 未配置，使用默认故事数据');
      const defaultData = getDefaultStoryData(style);
      storyObj = {
        title: defaultData.title,
        theme: defaultData.theme,
        hero_design: defaultData.hero_design,
        storyboard: defaultData.storyboard,
      };
      prompts = defaultData.prompts;
    }

    console.log(`🎨 共生成 ${prompts.length} 条分镜 Prompt`);

    // Step 5: 存入数据库（projects 表 + images 表）
    const { error: dbError } = await supabaseAdmin
      .from('projects')
      .update({
        title:       storyObj.title,
        theme:       storyObj.theme,
        hero_design: JSON.stringify(storyObj.hero_design),
        storyboard:  JSON.stringify(storyObj.storyboard),
        story:       JSON.stringify({ story: storyObj, prompts }),
        style,
        status:      'story_generated',
      })
      .eq('id', projectId);

    if (dbError) {
      console.error('❌ 保存故事失败:', dbError);
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Step 6: 往 images 表插入/更新 9 条分镜记录（含 prompt/scene_title）
    const imageRows = prompts.map((prompt: string, i: number) => ({
      project_id:  projectId,
      order_index: i,
      prompt:      prompt,
      scene_title: storyObj.storyboard?.[i]?.title || `分镜 ${i + 1}`,
      status:      'pending',
      regeneration_count: 0,
    }));

    const { error: imgError } = await supabaseAdmin.from('images').upsert(imageRows, {
      onConflict: 'project_id,order_index',
      ignoreDuplicates: false,
    });

    if (imgError) {
      console.error('❌ 插入 images 记录失败:', imgError);
    } else {
      console.log(`✅ 已插入/更新 ${imageRows.length} 条 images 记录`);
    }

    console.log('✅ generate-story 完成');
    return NextResponse.json({
      success: true,
      data: { projectId, title: storyObj.title, theme: storyObj.theme, prompts, story: storyObj, usedFallback: !hasKey },
    });
  } catch (err: any) {
    console.error('❌ generate-story 失败:', err);
    try {
      const body = await request.json().catch(() => ({}));
      if (body.projectId) {
        await supabaseAdmin.from('projects').update({ status: 'failed' }).eq('id', body.projectId);
      }
    } catch {}
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
