/**
 * AI Prompt 模板集中管理
 * 所有 AI 生成相关 Prompt 必须从本文件读取，禁止硬编码在组件或 API 中
 */

import { getStyleById } from './styles';

/** 九宫格固定结构 */
export const STORYBOARD_STRUCTURE = [
  { sortOrder: 1, title: '英雄原本生活', description: '主角日常' },
  { sortOrder: 2, title: '问题出现', description: '冲突发生' },
  { sortOrder: 3, title: '接受任务', description: '主角决定行动' },
  { sortOrder: 4, title: '遇到困难', description: '挫折' },
  { sortOrder: 5, title: '获得帮助', description: '得到助攻' },
  { sortOrder: 6, title: '开始成长', description: '能力提升' },
  { sortOrder: 7, title: '真相浮现', description: '发现真相' },
  { sortOrder: 8, title: '最终挑战', description: '高潮' },
  { sortOrder: 9, title: '英雄归来', description: '结局' },
] as const;

/** hero_design 角色一致性前缀（拼接到每条分镜 Prompt 前面） */
export function buildCharacterConsistencyRule(heroDesign: {
  name: string;
  species: string;
  color: string;
  costume: string;
  prop?: string;
}): string {
  const propPart = heroDesign.prop ? `, carrying ${heroDesign.prop}` : '';
  return `Character consistency:
${heroDesign.name} is a ${heroDesign.species} with ${heroDesign.color} ${heroDesign.costume}${propPart}.
This character design must remain IDENTICAL in every frame: same face, same proportions, same costume, same colors, same accessories.
Do NOT change the character's appearance between frames.`;
}

/**
 * 构建单条分镜图片 Prompt
 * @param sceneTitle     分镜标题
 * @param description     分镜描述
 * @param heroDesign     角色设定
 * @param styleId        风格 ID
 */
export function buildStoryboardImagePrompt(
  sceneTitle: string,
  description: string,
  heroDesign: { name: string; species: string; color: string; costume: string; prop?: string },
  styleId: string
): string {
  const style = getStyleById(styleId);
  const consistency = buildCharacterConsistencyRule(heroDesign);
  return `${consistency}

Scene "${sceneTitle}": ${description}

Aspect ratio: 16:9
Style: ${style.imagePromptSuffix}`.trim();
}

/** 默认 hero_design（API Key 未配置时降级使用） */
export const DEFAULT_HERO_DESIGN = {
  name: '小星星',
  species: '彩色小朋友',
  color: '彩虹七色',
  costume: '画笔图案的T恤',
  prop: '魔法画笔',
};

/** 默认故事正文（API Key 未配置时降级使用） */
export const DEFAULT_STORY = `在一个充满魔法的小镇上，住着一个叫小星星的小朋友。小星星最喜欢画画了，每天都会用彩笔画出自己想象中的世界。

有一天，小星星画了一只会飞的猫咪！这只猫咪有着彩虹色的毛发，眼睛像两颗闪闪发光的宝石。当小星星对着画作许愿时，神奇的事情发生了——画中的猫咪竟然活了过来！

彩虹猫带着小星星飞上了天空，他们一起穿过了云朵城堡，拜访了月亮婆婆，还在星河里游了个泳。最后，彩虹猫告诉小星星："只要你保持想象力，我永远都会陪着你。"

从此以后，小星星的每一幅画都充满了魔法，而彩虹猫也成了小星星最好的朋友。`;

/** 默认故事标题 */
export const DEFAULT_STORY_TITLE = '小星星与彩虹猫的冒险';
