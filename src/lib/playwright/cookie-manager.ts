// Cookie 管理模块
// 负责保存、读取和检测 Cookie 失效

import fs from 'fs';
import path from 'path';
import { BrowserContext } from 'playwright';

const COOKIE_DIR = path.join(process.cwd(), 'playwright', '.cache');

export interface CookieConfig {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

// 保存 Cookie 到本地文件
export async function saveCookies(
  context: BrowserContext, 
  service: 'doubao' | 'jimeng'
): Promise<void> {
  const cookies = await context.cookies();
  const filePath = path.join(COOKIE_DIR, `${service}-cookies.json`);
  
  // 确保目录存在
  if (!fs.existsSync(COOKIE_DIR)) {
    fs.mkdirSync(COOKIE_DIR, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
  console.log(`✅ ${service} Cookie 已保存到: ${filePath}`);
}

// 从本地文件读取 Cookie
export async function loadCookies(
  service: 'doubao' | 'jimeng'
): Promise<CookieConfig[]> {
  const filePath = path.join(COOKIE_DIR, `${service}-cookies.json`);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ ${service} Cookie 文件不存在: ${filePath}`);
    return [];
  }
  
  const cookieData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(cookieData);
}

// 检测 Cookie 是否失效
export async function checkCookieValidity(
  context: BrowserContext,
  service: 'doubao' | 'jimeng'
): Promise<boolean> {
  try {
    const cookies = await context.cookies();
    const serviceCookies = cookies.filter(c => 
      service === 'doubao' 
        ? c.domain.includes('doubao.com') 
        : c.domain.includes('jimeng')
    );
    
    if (serviceCookies.length === 0) {
      console.warn(`⚠️ ${service} 未找到有效 Cookie`);
      return false;
    }
    
    // 检查是否过期
    const now = Date.now() / 1000;
    const expiredCookies = serviceCookies.filter(c => 
      c.expires > 0 && c.expires < now
    );
    
    if (expiredCookies.length > 0) {
      console.warn(`⚠️ ${service} 有 ${expiredCookies.length} 个 Cookie 已过期`);
      return false;
    }
    
    console.log(`✅ ${service} Cookie 有效`);
    return true;
  } catch (error) {
    console.error(`❌ 检测 ${service} Cookie 时出错:`, error);
    return false;
  }
}

// 清除 Cookie
export function clearCookies(service: 'doubao' | 'jimeng'): void {
  const filePath = path.join(COOKIE_DIR, `${service}-cookies.json`);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🗑️ ${service} Cookie 已清除`);
  }
}

// 获取 Cookie 过期时间
export async function getCookieExpiry(
  service: 'doubao' | 'jimeng'
): Promise<Date | null> {
  const cookies = await loadCookies(service);
  if (cookies.length === 0) return null;
  
  const maxExpiry = Math.max(...cookies.map(c => c.expires || 0));
  return maxExpiry > 0 ? new Date(maxExpiry * 1000) : null;
}
