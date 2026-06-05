/**
 * 七牛云资源代理 API
 * 所有资源通过此路由访问，兼容新旧两种 URL 格式：
 * - 新格式（推荐）：/api/resource/videos/xxx.mp4
 * - 旧格式（兼容）：/api/resource/https://czbd.digit3ds.com/videos/xxx.mp4
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

const QINIU_ACCESS_KEY = process.env.QINIU_ACCESS_KEY || '';
const QINIU_SECRET_KEY = process.env.QINIU_SECRET_KEY || '';
// 使用 HTTP 让 Cloudflare Flexible SSL 生效（Cloudflare→七牛走 HTTP，绕过 SSL 证书不匹配）
const QINIU_ORIGIN = 'http://czbd.digit3ds.com';
const CDN_HOST = 'czbd.digit3ds.com';

function generateSignedUrl(key: string, expiresInSeconds = 3600): string {
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const url = `${QINIU_ORIGIN}/${key}?e=${deadline}`;
  const hmac = crypto.createHmac('sha1', QINIU_SECRET_KEY);
  hmac.update(url);
  const sign = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
  return `${url}&token=${QINIU_ACCESS_KEY}:${sign}`;
}

/**
 * 规范化 key：兼容旧 CDN URL 和新相对路径
 * /api/resource/videos/xxx.mp4  → videos/xxx.mp4
 * /api/resource/https://czbd.digit3ds.com/videos/xxx.mp4 → videos/xxx.mp4
 */
function normalizeKey(pathSegment: string[]): string | null {
  // 清理路径段
  const key = pathSegment.join('/');

  // 情况1：新格式，直接就是 key
  if (!key.startsWith('http')) {
    return key && !key.includes('..') ? key : null;
  }

  // 情况2：旧格式嵌入的完整 URL，解构它
  try {
    const url = new URL(key);
    if (url.hostname !== CDN_HOST) return null;
    const extracted = url.pathname.replace(/^\//, '');
    return extracted && !extracted.includes('..') ? extracted : null;
  } catch {
    return null;
  }
}

async function proxyFetch(key: string) {
  const signedUrl = generateSignedUrl(key, 3600);
  const response = await fetch(signedUrl, { headers: { 'User-Agent': 'Vercel-Proxy/1.0' } });

  if (!response.ok) {
    console.error(`[Resource Proxy] Failed to fetch ${key}: ${response.status}`);
    return { status: response.status === 404 ? 404 : 502, buffer: null, contentType: null };
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  return { status: 200, buffer, contentType };
}

export async function GET(request: NextRequest, context: any) {
  try {
    const key = normalizeKey((await context.params).path);

    if (!key) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const { status, buffer, contentType } = await proxyFetch(key);

    if (buffer === null) {
      return NextResponse.json({ error: 'File not found' }, { status });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('[Resource Proxy] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest, context: any) {
  try {
    const key = normalizeKey((await context.params).path);

    if (!key) {
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
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
