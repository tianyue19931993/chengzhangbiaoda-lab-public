// 豆包 AI 自动化脚本
// 负责：OCR、图片理解、故事生成、Prompt 生成

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as cookieManager from './cookie-manager';

const DOUBAO_URL = 'https://www.doubao.com';

export interface DoubaoResult {
  story: string;
  prompts: string[];
  success: boolean;
  error?: string;
}

export class DoubaoAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  // 初始化浏览器
  async launch(): Promise<void> {
    console.log('🚀 启动豆包自动化...');
    
    this.browser = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
      slowMo: 50,
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    
    // 加载 Cookie
    const cookies = await cookieManager.loadCookies('doubao');
    if (cookies.length > 0) {
      await this.context.addCookies(cookies);
      console.log(`✅ 已加载 ${cookies.length} 个豆包 Cookie`);
    } else {
      console.warn('⚠️ 未找到豆包 Cookie，请先登录');
    }
    
    this.page = await this.context.newPage();
  }

  // 检测登录状态
  async checkLogin(): Promise<boolean> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      await this.page.goto(DOUBAO_URL, { timeout: 30000 });
      await this.page.waitForTimeout(2000);
      
      // 检查是否有登录后的特征元素
      const isLoggedIn = await this.page.locator('text=新对话').isVisible().catch(() => false);
      
      if (isLoggedIn) {
        console.log('✅ 豆包登录状态有效');
        // 保存最新的 Cookie
        await cookieManager.saveCookies(this.context!, 'doubao');
        return true;
      } else {
        console.warn('⚠️ 豆包未登录或 Cookie 已失效');
        return false;
      }
    } catch (error) {
      console.error('❌ 检测豆包登录状态时出错:', error);
      return false;
    }
  }

  // 上传图片并生成故事
  async generateStory(imagePath: string, style: string = 'pixar'): Promise<DoubaoResult> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      console.log('📤 上传图片到豆包...');
      
      // 打开豆包
      await this.page.goto(`${DOUBAO_URL}/chat`, { timeout: 30000 });
      await this.page.waitForTimeout(3000);
      
      // 上传图片
      const fileInput = await this.page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(imagePath);
      console.log('✅ 图片上传成功');
      
      await this.page.waitForTimeout(2000);
      
      // 输入提示词
      const prompt = this.buildPrompt(style);
      const inputBox = await this.page.locator('textarea').first();
      await inputBox.fill(prompt);
      console.log('✅ 提示词已填写');
      
      await this.page.waitForTimeout(1000);
      
      // 点击发送
      const sendButton = await this.page.locator('button[aria-label="发送"]').first();
      await sendButton.click();
      console.log('✅ 已点击发送');
      
      // 等待生成完成
      console.log('⏳ 等待豆包生成故事...');
      await this.page.waitForTimeout(10000); // 等待初始响应
      
      // 等待生成完成（检测停止生成按钮消失）
      await this.page.waitForSelector('button[aria-label="停止生成"]', { 
        state: 'detached', 
        timeout: 120000 
      }).catch(() => console.log('⚠️ 等待超时，继续尝试获取结果'));
      
      await this.page.waitForTimeout(3000);
      
      // 获取生成的内容
      const messages = await this.page.locator('[data-message-id]').all();
      const lastMessage = messages[messages.length - 1];
      const generatedText = await lastMessage.locator('.markdown-body').innerText();
      
      console.log('✅ 故事生成完成');
      
      // 解析生成的内容
      const result = this.parseGeneratedContent(generatedText);
      
      // 保存最新的 Cookie
      await cookieManager.saveCookies(this.context!, 'doubao');
      
      return {
        ...result,
        success: true,
      };
    } catch (error: any) {
      console.error('❌ 豆包生成故事失败:', error);
      return {
        story: '',
        prompts: [],
        success: false,
        error: error.message,
      };
    }
  }

  // 构建提示词
  private buildPrompt(style: string): string {
    return `请分析这张儿童绘画作品，并完成以下任务：

1. **OCR识别**：识别画中的文字、勾选项、手写内容
2. **图片理解**：描述画面内容、角色、场景
3. **故事创作**：写一个适合儿童的童话故事（200-300字）
4. **分镜Prompt**：生成9个分镜画面的AI绘画提示词

风格要求：${this.getStylePrompt(style)}

请按以下格式输出：

## 故事
（这里写故事）

## 分镜提示词
1. [分镜1的提示词]
2. [分镜2的提示词]
...
9. [分镜9的提示词]`;
  }

  // 获取风格提示词
  private getStylePrompt(style: string): string {
    const stylePrompts: Record<string, string> = {
      pixar: 'Pixar animation style, 3D animated movie, cinematic lighting, cute character, high quality rendering, Disney Pixar style',
      guofeng: 'Chinese fantasy style, traditional Chinese painting, ink wash style, celestial atmosphere',
      anime: 'Anime style, Japanese animation, vibrant colors, clean lines, manga style',
      watercolor: 'Watercolor illustration, soft colors, artistic, gentle brushstrokes',
      cyberpunk: 'Cyberpunk neon style, futuristic, neon lights, high contrast, sci-fi atmosphere',
    };
    
    return stylePrompts[style] || stylePrompts['pixar'];
  }

  // 解析生成的内容
  private parseGeneratedContent(text: string): { story: string; prompts: string[] } {
    const storyMatch = text.match(/## 故事\s*([\s\S]*?)## 分镜提示词/);
    const story = storyMatch ? storyMatch[1].trim() : '';
    
    const promptMatches = text.match(/\d+\.\s*(.+)/g);
    const prompts = promptMatches 
      ? promptMatches.map(p => p.replace(/^\d+\.\s*/, '').trim())
      : [];
    
    return { story, prompts };
  }

  // 关闭浏览器
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      console.log('✅ 豆包自动化已关闭');
    }
  }
}

// 导出便捷函数
export async function generateStoryWithDoubao(
  imagePath: string, 
  style: string = 'pixar'
): Promise<DoubaoResult> {
  const douban = new DoubaoAutomation();
  
  try {
    await douban.launch();
    
    const isLoggedIn = await douban.checkLogin();
    if (!isLoggedIn) {
      throw new Error('豆包未登录，请先在浏览器中登录豆包');
    }
    
    const result = await douban.generateStory(imagePath, style);
    return result;
  } finally {
    await douban.close();
  }
}
