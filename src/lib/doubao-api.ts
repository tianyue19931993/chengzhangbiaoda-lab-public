/**
 * 豆包 API 调用封装
 * 文档: https://www.volcengine.com/docs/82379
 *
 * 环境变量:
 *   DOUBAO_API_KEY  - 豆包 API Key (Volcengine)
 *   DOUBAO_BASE_URL - 默认 https://ark.cn-beijing.volces.com/api/v3
 */

import OpenAI from 'openai';

const BASE_URL = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const API_KEY  = process.env.DOUBAO_API_KEY || '';

if (!API_KEY) {
  console.warn('⚠️  DOUBAO_API_KEY 未设置，豆包 AI 功能将无法使用');
}

let _doubao: OpenAI | null = null;

export function getDoubaoClient(): OpenAI {
  if (!_doubao) {
    if (!API_KEY) {
      throw new Error('DOUBAO_API_KEY 未设置，请在 .env.local 中配置豆包 API Key');
    }
    _doubao = new OpenAI({
      apiKey:  API_KEY,
      baseURL: BASE_URL,
    });
  }
  return _doubao;
}

export const doubao = new Proxy({} as OpenAI, {
  get: (target, prop) => getDoubaoClient()[prop as keyof OpenAI],
});

// 常用模型 ID（在 Volcengine 控制台确认接入点 ID）
export const MODELS = {
  // 视觉理解（识图）
  vision:  process.env.DOUBAO_VISION_MODEL  || 'doubao-1.5-vision-pro-250328',
  // 对话 / 故事生成
  chat:   process.env.DOUBAO_CHAT_MODEL    || 'doubao-1.5-pro-32k-250515',
  // 图片生成
  image:  process.env.DOUBAO_IMAGE_MODEL   || 'doubao-seedream-3-0-t2i-250415',
  // 视频生成
  video:  process.env.DOUBAO_VIDEO_MODEL   || 'doubao-seedance-2-0',
} as const;

/**
 * 调用豆包视觉理解，识别图片内容
 * @returns 图片识别结果文本
 */
export async function understandImage(imageUrl: string): Promise<string> {
  console.log('🔍 豆包视觉理解:', imageUrl.slice(0, 60));
  const res = await doubao.chat.completions.create({
    model: MODELS.vision,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请详细描述这张图片的内容，包括：1.图中画了什么 2.手写了什么文字 3.如果是儿童手绘画，描述画了什么内容、主角长什么样、什么颜色。用中文回答。' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 1000,
  });
  return res.choices[0]?.message?.content || '';
}

/**
 * 调用豆包 LLM 生成结构化故事 JSON
 * @returns 解析后的故事对象
 */
export async function generateStory(
  imageUnderstanding: string,
  style: string
): Promise<{
  title: string;
  theme: string;
  hero_design: { name: string; species: string; fur_color: string; clothes: string; item?: string };
  storyboard: { scene: number; title: string; description: string }[];
}> {
  console.log('🤖 豆包 LLM 生成故事...');
  const styleMap: Record<string, string> = {
    pixar:     'Pixar 3D 儿童动画风格，色彩明亮、角色可爱、光影柔和',
    guofeng:   '中国国风，水墨画质感，传统色彩',
    anime:     '日式二次元动漫风格，大眼睛、鲜艳色彩',
    watercolor:'水彩画风格，色彩透明柔和，笔触自然',
    cyberpunk: '赛博朋克风格，霓虹灯、未来科技感',
  };
  const stylePrompt = styleMap[style] || styleMap.pixar;

  const systemPrompt = `你是一个专业的儿童动画编剧。根据图片识别内容，生成一个适合儿童的故事。
输出严格的 JSON（不要加任何解释），格式如下：
{
  "title": "故事标题",
  "theme": "成长/勇气/友谊/环保等主题",
  "hero_design": {
    "name": "主角名字",
    "species": "物种（如：小狐狸、小猫、小女孩）",
    "fur_color": "主色调（如：橙色、粉色）",
    "clothes": "服装描述",
    "item": "携带的道具（可选）"
  },
  "storyboard": [
    { "scene": 1, "title": "英雄原本生活",   "description": "..." },
    { "scene": 2, "title": "问题出现",       "description": "..." },
    { "scene": 3, "title": "接受任务",       "description": "..." },
    { "scene": 4, "title": "遇到困难",       "description": "..." },
    { "scene": 5, "title": "获得帮助",       "description": "..." },
    { "scene": 6, "title": "开始成长",       "description": "..." },
    { "scene": 7, "title": "真相浮现",       "description": "..." },
    { "scene": 8, "title": "最终挑战",       "description": "..." },
    { "scene": 9, "title": "英雄归来",       "description": "..." }
  ]
}
风格要求：${stylePrompt}
重要：所有分镜的角色设定必须严格引用 hero_design 中的设定，不能改变主角外观。`;

  const res = await doubao.chat.completions.create({
    model: MODELS.chat,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `图片识别结果：${imageUnderstanding}\n\n请生成故事JSON。` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const text = res.choices[0]?.message?.content || '';
  return JSON.parse(text);
}

/**
 * 根据结构化故事，生成 9 条独立的分镜 Prompt
 * 每条 Prompt 强制引用 hero_design，确保角色一致性
 */
export function buildPrompts(
  story: {
    title: string;
    theme: string;
    hero_design: { name: string; species: string; fur_color: string; clothes: string; item?: string };
    storyboard: { scene: number; title: string; description: string }[];
  },
  style: string
): string[] {
  const { hero_design, storyboard } = story;
  const heroDesc = `${hero_design.name}（${hero_design.species}，${hero_design.fur_color}，${hero_design.clothes}${hero_design.item ? '，手持' + hero_design.item : ''}）`;

  const styleSuffix: Record<string, string> = {
    pixar:     'Pixar 3D 动画风格，cinematic lighting，迪士尼品质',
    guofeng:   '国风水墨画风格，中国传统美学',
    anime:     '日式二次元动漫风格，宫崎骏风格',
    watercolor:'水彩画风格，透明色彩，柔和笔触',
    cyberpunk: '赛博朋克风格，霓虹灯光，未来科技感',
  };

  return storyboard.map((s) => {
    return `分镜${s.scene}「${s.title}」：${s.description}\n角色：${heroDesc}（此角色设定在所有分镜中必须保持一致）\n风格：${styleSuffix[style] || styleSuffix.pixar}`;
  });
}

/**
 * 调用豆包图片生成 API，生成单张分镜图
 * @param prompt 分镜 Prompt
 * @returns 图片 URL
 */
export async function generateImage(prompt: string): Promise<string> {
  console.log('🎨 豆包生图:', prompt.slice(0, 50));
  const res = await doubao.images.generate({
    model:    MODELS.image,
    prompt:   prompt,
    size:     'landscape_16_9',
    n:        1,
    response_format: 'url',
  });
  const url = (res.data?.[0] as any)?.url || (res.data?.[0] as any)?.b64_json;
  if (!url) throw new Error('豆包生图返回为空');
  return url as string;
}

/**
 * 调用豆包视频生成 API
 * 参考文档: https://www.volcengine.com/docs/82379
 * @param imageUrls 9 张分镜图 URL
 * @param prompt    故事文本
 * @param style     风格
 * @returns 视频 URL（同步模式）或任务 ID（异步模式）
 */
export async function generateVideo(
  imageUrls: string[],
  prompt: string,
  style: string
): Promise<string> {
  console.log('🎬 豆包生视频...');
  // Seedance 2.0 通过 openai 兼容接口调用
  // 实际调用方式以豆包文档为准，这里提供标准 openai 视频生成写法
  const res = await doubao.chat.completions.create({
    model: MODELS.video,
    messages: [
      {
        role:    'user',
        content: `请根据以下 9 张分镜图和故事文本，生成一段 15 秒的动画视频。\n\n分镜图：${imageUrls.join('，')}\n\n故事：${prompt}\n\n风格：${style}`,
      },
    ],
    max_tokens: 1024,
  });
  // 视频 URL 的解析方式取决于豆包 API 实际返回格式
  // 这里先返回文本内容，后续按文档调整
  const content = res.choices[0]?.message?.content || '';
  // 尝试从返回内容中提取 URL
  const urlMatch = content.match(/https?:\/\/[^\s]+\.(mp4|mov|avi)["]?/);
  return urlMatch?.[0] || content;
}
