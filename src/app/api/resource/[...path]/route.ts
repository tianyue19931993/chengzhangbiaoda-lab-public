/**
 * 七牛云资源代理 API
 * 所有资源通过此路由访问，避免跨域和 SSL 证书问题
 * 
 * 用法：
 * - 原：https://czbd.digit3ds.com/videos/xxx.mp4
 * - 新：/api/resource/videos/xxx.mp4
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

const QINIU_ACCESS_KEY = process.env.QINIU_ACCESS_KEY || '';
const QINIU_SECRET_KEY = process.env.QINIU_SECRET_KEY || '';
const QINIU_BUCKET = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab';
const QINIU_ORIGIN = 'https://iovip-z0.qiniuio.com'; // 七牛云源站（私有访问）

/**
 * 生成七牛云私有空间签名 URL
 */
function generateSignedUrl(key: string, expiresInSeconds = 3600): string {
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const url = `${QINIU_ORIGIN}/${key}?e=${deadline}`;
  
  const hmac = crypto.createHmac('sha1', QINIU_SECRET_KEY);
  hmac.update(url);
  const sign = hmac.digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${url}&token=${QINIU_ACCESS_KEY}:${sign}`;
}

/**
 * GET /api/resource/[...path]
 * 代理七牛云资源
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 1. 拼接文件路径（Next.js 15+ params 是 Promise）
    const resolvedParams = await params;
    const key = resolvedParams.path.join('/');
    
    if (!key || key.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    // 2. 生成签名 URL（私有桶访问）
    const signedUrl = generateSignedUrl(key, 3600);
    
    // 3. 从七牛云获取文件
    const response = await fetch(signedUrl, {
      headers: {
        'User-Agent': 'Vercel-Proxy/1.0',
      },
    });
    
    if (!response.ok) {
      console.error(`[Resource Proxy] Failed to fetch ${key}: ${response.status}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: response.status === 404 ? 404 : 502 }
      );
    }
    
    // 4. 获取文件内容
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // 5. 返回文件（带缓存）
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable', // 缓存 7 天
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*', // 允许跨域
      },
    });
    
  } catch (error: any) {
    console.error('[Resource Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/resource/[...path]
 * 支持 HEAD 请求（用于检查文件是否存在）
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const key = resolvedParams.path.join('/');
    
    if (!key || key.includes('..')) {
      return new NextResponse(null, { status: 400 });
    }
    
    const signedUrl = generateSignedUrl(key, 3600);
    const response = await fetch(signedUrl, { method: 'HEAD' });
    
    return new NextResponse(null, {
      status: response.ok ? 200 : response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Length': response.headers.get('content-length') || '0',
      },
    });
    
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}
