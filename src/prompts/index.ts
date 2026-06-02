/**
 * prompts 模块统一导出
 * 使用方式：
 *   import { STYLES, getStyleById, buildStoryboardImagePrompt, ... } from '@/prompts'
 */
export {
  STYLES,
  STYLE_OPTIONS,
  getStyleById,
  type StyleConfig,
} from './styles';

export {
  STORYBOARD_STRUCTURE,
  buildCharacterConsistencyRule,
  buildStoryboardImagePrompt,
  DEFAULT_HERO_DESIGN,
  DEFAULT_STORY,
  DEFAULT_STORY_TITLE,
} from './ai-prompts';
