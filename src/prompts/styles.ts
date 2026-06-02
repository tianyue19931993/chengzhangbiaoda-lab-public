/**
 * 风格配置（Prompt 集中管理，禁止硬编码在组件中）
 * 所有 AI 生成的风格 Prompt 均从本文件读取
 */

export interface StyleConfig {
  id: string;
  name: string;
  description: string;
  /** 生成故事时传给 LLM 的风格描述 */
  storyPrompt: string;
  /** 生成图片时追加的 suffix Prompt */
  imagePromptSuffix: string;
}

export const STYLES: StyleConfig[] = [
  {
    id: 'pixar',
    name: '🎬 Pixar 3D 动画风',
    description: '迪士尼皮克斯风格，色彩明亮、角色可爱',
    storyPrompt:
      'Pixar 3D 儿童动画风格，色彩明亮、角色可爱、光影柔和，情感丰富、叙事温暖',
    imagePromptSuffix:
      'Pixar animation style, Disney Pixar style, 3D animated movie, cinematic lighting, cute character, high quality rendering, soft global illumination, stylized proportions, expressive facial animation, vibrant colors, cinematic composition, animated film aesthetic, warm atmosphere, high detail, emotional storytelling, dynamic camera, dreamy lighting',
  },
  {
    id: 'chinese',
    name: '🏮 国风',
    description: '中国古风，水墨画质感，传统美学',
    storyPrompt: '中国国风，水墨画质感，传统色彩，诗词意境，东方幻想',
    imagePromptSuffix:
      'Chinese fantasy style, ancient Chinese aesthetics, traditional Chinese painting, xianxia atmosphere, oriental fantasy, ink wash texture, elegant composition, flowing costume, Chinese mythology inspired, golden light, misty mountains, ethereal environment, traditional architecture, soft watercolor ink, poetic cinematic lighting, fantasy Chinese world, high detail, dreamlike atmosphere',
  },
  {
    id: 'anime',
    name: '🌸 二次元',
    description: '日式动漫风格，宫崎骏风格',
    storyPrompt: '日式二次元动漫风格，宫崎骏风格，大眼睛、鲜艳色彩、细腻情感',
    imagePromptSuffix:
      'anime style, Japanese animation, highly detailed anime art, vibrant anime colors, dynamic action pose, beautiful anime eyes, cinematic anime lighting, fantasy anime world, soft shading, clean line art, Makoto Shinkai inspired, high emotional impact, cute anime character, dramatic composition, anime movie aesthetic, stylized environment, dynamic perspective',
  },
  {
    id: 'watercolor',
    name: '🎨 水彩',
    description: '水彩画风格，透明柔和，笔触自然',
    storyPrompt: '水彩画风格，色彩透明柔和，笔触自然，绘本质感',
    imagePromptSuffix:
      'watercolor illustration, storybook painting, soft watercolor texture, hand-painted style, gentle pastel colors, paper grain texture, dreamy atmosphere, children\'s book illustration, soft edges, warm artistic feeling, delicate brush strokes, illustrated fantasy world, light watercolor wash, cozy and magical, poetic composition, traditional watercolor aesthetic',
  },
  {
    id: 'cyberpunk',
    name: '🌃 赛博朋克',
    description: '未来科幻风格，霓虹灯光',
    storyPrompt: '赛博朋克风格，霓虹灯光、未来科技感，青少年科幻',
    imagePromptSuffix:
      'cyberpunk style, futuristic neon city, glowing holograms, sci-fi atmosphere, high-tech environment, neon lighting, cinematic cyberpunk aesthetic, purple and blue neon, digital world, futuristic character design, dramatic lighting, rainy cyberpunk city, glowing particles, high contrast, sci-fi cinematic composition, Blade Runner inspired, ultra detailed',
  },
];

/** 根据 style_id 查找风格配置，找不到返回 pixar 默认值 */
export function getStyleById(id: string): StyleConfig {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}

/** 获取所有风格列表（用于上传页等场景） */
export const STYLE_OPTIONS = STYLES.map(({ id, name, description }) => ({
  id,
  name,
  description,
}));
