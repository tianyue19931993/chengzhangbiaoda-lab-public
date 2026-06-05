/**
 * 七牛云资源代理 API
 * 所有资源通过此路由访问，避免跨域和 SSL 证书问题
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

const QINIU_ACCESS_KEY = process.env.QINIU_ACCESS_KEY || '';
const QINIU_SECRET_KEY = process.env.QINIU_SECRET_KEY || '';
const QINIU_ORIGIN = 'https://iovip-z0.qiniuio.com';

function generateSignedUrl(key: string, expiresInSeconds = 3600): string {
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const url = `${QINIU_ORIGIN}/${key}?e=${deadline}`;
  const hmac = crypto.createHmac('sha1', QINIU_SECRET_KEY);
  hmac.update(url);
  const sign = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
  return `${url}&token=${QINIU_ACCESS_KEY}:${sign}`;
}

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context.params;
    const key = (params.path as string[]).join('/');
    
    if (!key || key.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    const signedUrl = generateSignedUrl(key, 3600);
    const response = await fetch(signedUrl, { headers: { 'User-Agent': 'Vercel-Proxy/1.0' } });
    
    if (!response.ok) {
      console.error(`[Resource Proxy] Failed to fetch ${key}: ${response.status}`);
      return NextResponse.json({ error: 'File not found' }, { status: response.status === 404 ? 404 : 502 });
    }
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
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
    const params = await context.params;
    const key = (params.path as string[]).join('/');
    
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
