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
  name: '小朋友f432703',
  species: '彩色小朋友',
  color: '彩虹七色',
  costume: '画笔图案的T恤',
  prop: '魔法画笔',
};

/** 默认故事正文（API Key 未配置时降级使用） */
export const DEFAULT_STORY = `贪玩迷糊的笨笨公主私自溜出王宫，误入黑巫师设下的迷雾树洞陷阱，被魔法困住无法脱身，侍卫四处搜寻无果。危急时刻，霸气果敢的大霸王妈妈得知消息，告别王宫安逸生活，独自踏上营救之路。

她穿过荆棘丛林，巧妙破解沿途巫师布下的瓜果迷阵，凭借丰富阅历识破幻术。抵达树洞后，大霸王妈妈冷静和黑巫师周旋，抓住对方法术破绽打破禁锢魔法，顺利救出慌哭的笨笨公主。

回宫后，妈妈没有严厉斥责，耐心教导公主牢记外出规矩。笨笨公主知错悔改，从此不再独自乱跑，母女俩安稳幸福地生活在城堡里。`;

/** 默认故事标题 */
export const DEFAULT_STORY_TITLE = '小星星与彩虹猫的冒险';
