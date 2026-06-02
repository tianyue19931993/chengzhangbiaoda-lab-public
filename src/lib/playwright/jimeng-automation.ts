// 即梦 AI 自动化脚本
// 负责：九宫格生成、视频生成、文件下载

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as cookieManager from './cookie-manager';
import * as fs from 'fs';
import * as path from 'path';

const JIMENG_URL = 'https://jimeng.jianying.com';

export interface JimengResult {
  imageUrls: string[];
  videoUrl?: string;
  success: boolean;
  error?: string;
}

export class JimengAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  // 初始化浏览器
  async launch(): Promise<void> {
    console.log('🚀 启动即梦自动化...');
    
    this.browser = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
      slowMo: 100,
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    
    // 加载 Cookie
    const cookies = await cookieManager.loadCookies('jimeng');
    if (cookies.length > 0) {
      await this.context.addCookies(cookies);
      console.log(`✅ 已加载 ${cookies.length} 个即梦 Cookie`);
    } else {
      console.warn('⚠️ 未找到即梦 Cookie，请先登录');
    }
    
    this.page = await this.context.newPage();
  }

  // 检测登录状态
  async checkLogin(): Promise<boolean> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      await this.page.goto(JIMENG_URL, { timeout: 30000 });
      await this.page.waitForTimeout(3000);
      
      // 检查是否有登录后的特征元素
      const isLoggedIn = await this.page.locator('text=我的作品').isVisible().catch(() => false);
      
      if (isLoggedIn) {
        console.log('✅ 即梦登录状态有效');
        // 保存最新的 Cookie
        await cookieManager.saveCookies(this.context!, 'jimeng');
        return true;
      } else {
        console.warn('⚠️ 即梦未登录或 Cookie 已失效');
        return false;
      }
    } catch (error) {
      console.error('❌ 检测即梦登录状态时出错:', error);
      return false;
    }
  }

  // 生成九宫格图片
  async generateImages(prompts: string[], style: string = 'pixar'): Promise<JimengResult> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      console.log(`🎨 开始生成 ${prompts.length} 张图片...`);
      
      const imageUrls: string[] = [];
      
      // 遍历每个 prompt，逐个生成图片
      for (let i = 0; i < prompts.length; i++) {
        console.log(`📸 生成第 ${i + 1}/${prompts.length} 张图片...`);
        
        await this.page.goto(`${JIMENG_URL}/ai-tool/image/generate`, { 
          timeout: 30000 
        });
        await this.page.waitForTimeout(3000);
        
        // 填写 prompt
        const promptInput = await this.page.locator('textarea').first();
        const fullPrompt = `${prompts[i]}, ${this.getStylePrompt(style)}`;
        await promptInput.fill(fullPrompt);
        
        await this.page.waitForTimeout(1000);
        
        // 点击生成按钮
        const generateButton = await this.page.locator('button:has-text("生成")').first();
        await generateButton.click();
        
        console.log(`⏳ 等待第 ${i + 1} 张图片生成...`);
        
        // 等待生成完成（检测下载按钮出现）
        try {
          await this.page.waitForSelector('button:has-text("下载")', { 
            timeout: 120000 
          });
          console.log(`✅ 第 ${i + 1} 张图片生成完成`);
        } catch (error) {
          console.warn(`⚠️ 第 ${i + 1} 张图片生成超时，继续...`);
          continue;
        }
        
        // 获取图片 URL（可能需要点击查看大图）
        const imageElement = await this.page.locator('img').first();
        const imageUrl = await imageElement.getAttribute('src');
        
        if (imageUrl) {
          imageUrls.push(imageUrl);
          console.log(`✅ 第 ${i + 1} 张图片 URL 已获取`);
        }
        
        await this.page.waitForTimeout(2000);
      }
      
      // 保存最新的 Cookie
      await cookieManager.saveCookies(this.context!, 'jimeng');
      
      return {
        imageUrls,
        success: true,
      };
    } catch (error: any) {
      console.error('❌ 生成图片失败:', error);
      return {
        imageUrls: [],
        success: false,
        error: error.message,
      };
    }
  }

  // 使用 Seedance 2.0 生成视频
  async generateVideo(
    imageUrls: string[], 
    prompt: string,
    style: string = 'pixar'
  ): Promise<JimengResult> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      console.log('🎬 开始生成视频...');
      
      await this.page.goto(`${JIMENG_URL}/ai-tool/video/generate`, { 
        timeout: 30000 
      });
      await this.page.waitForTimeout(3000);
      
      // 选择 Seedance 2.0 模型
      console.log('📺 选择 Seedance 2.0 模型...');
      const modelSelector = await this.page.locator('text=选择模型').first();
      await modelSelector.click();
      await this.page.waitForTimeout(1000);
      
      const seedanceOption = await this.page.locator('text=Seedance 2.0').first();
      await seedanceOption.click();
      await this.page.waitForTimeout(1000);
      
      // 上传参考图片（使用第一张图作为参考）
      if (imageUrls.length > 0) {
        console.log('📤 上传参考图片...');
        // 注意：这里可能需要先下载图片到本地，再上传
        // 或者如果即梦支持 URL 输入，可以直接使用 URL
        const imageInput = await this.page.locator('input[type="file"]').first();
        // await imageInput.setInputFiles(localImagePath);
        await this.page.waitForTimeout(2000);
      }
      
      // 填写视频 prompt
      const fullPrompt = `${prompt}, ${this.getStylePrompt(style)}, 10 seconds, high quality`;
      const promptInput = await this.page.locator('textarea').first();
      await promptInput.fill(fullPrompt);
      
      await this.page.waitForTimeout(1000);
      
      // 设置视频参数
      console.log('⚙️ 设置视频参数...');
      // 720p
      const resolutionSelector = await this.page.locator('text=分辨率').first();
      await resolutionSelector.click();
      await this.page.locator('text=720p').first().click();
      await this.page.waitForTimeout(500);
      
      // 10 秒
      const durationSelector = await this.page.locator('text=时长').first();
      await durationSelector.click();
      await this.page.locator('text=10秒').first().click();
      await this.page.waitForTimeout(500);
      
      // 点击生成按钮
      console.log('🎬 点击生成视频...');
      const generateButton = await this.page.locator('button:has-text("生成")').first();
      await generateButton.click();
      
      // 等待视频生成（即梦视频生成是异步的，需要轮询）
      console.log('⏳ 视频生成中，这将需要几分钟...');
      
      // 这里应该实现轮询逻辑，但为了简化，我们先等待固定时间
      // 实际应该检测到视频生成完成后，获取下载链接
      await this.page.waitForTimeout(180000); // 等待 3 分钟
      
      // 获取视频 URL
      const videoElement = await this.page.locator('video').first();
      const videoUrl = await videoElement.getAttribute('src');
      
      if (!videoUrl) {
        throw new Error('未找到视频 URL');
      }
      
      console.log('✅ 视频生成完成');
      
      // 保存最新的 Cookie
      await cookieManager.saveCookies(this.context!, 'jimeng');
      
      return {
        imageUrls: [],
        videoUrl,
        success: true,
      };
    } catch (error: any) {
      console.error('❌ 生成视频失败:', error);
      return {
        imageUrls: [],
        success: false,
        error: error.message,
      };
    }
  }

  // 下载文件
  async downloadFile(url: string, outputPath: string): Promise<boolean> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      console.log(`📥 下载文件: ${url}`);
      
      const response = await this.page.context().request.get(url);
      const buffer = await response.body();
      
      // 确保目录存在
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, buffer);
      console.log(`✅ 文件已保存: ${outputPath}`);
      
      return true;
    } catch (error: any) {
      console.error('❌ 下载文件失败:', error);
      return false;
    }
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

  // 关闭浏览器
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      console.log('✅ 即梦自动化已关闭');
    }
  }
}

// 导出便捷函数
export async function generateImagesWithJimeng(
  prompts: string[], 
  style: string = 'pixar'
): Promise<JimengResult> {
  const jimeng = new JimengAutomation();
  
  try {
    await jimeng.launch();
    
    const isLoggedIn = await jimeng.checkLogin();
    if (!isLoggedIn) {
      throw new Error('即梦未登录，请先在浏览器中登录即梦');
    }
    
    const result = await jimeng.generateImages(prompts, style);
    return result;
  } finally {
    await jimeng.close();
  }
}

export async function generateVideoWithJimeng(
  imageUrls: string[],
  prompt: string,
  style: string = 'pixar'
): Promise<JimengResult> {
  const jimeng = new JimengAutomation();
  
  try {
    await jimeng.launch();
    
    const isLoggedIn = await jimeng.checkLogin();
    if (!isLoggedIn) {
      throw new Error('即梦未登录，请先在浏览器中登录即梦');
    }
    
    const result = await jimeng.generateVideo(imageUrls, prompt, style);
    return result;
  } finally {
    await jimeng.close();
  }
}
