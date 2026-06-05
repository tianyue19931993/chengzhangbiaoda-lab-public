import { NextRequest, NextResponse } from 'next/server';

const QINIU_ORIGIN = process.env.QINIU_CDN_ORIGIN || 'http://czbd.digit3ds.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegment } = await params;

  // 将路径段拼接成七牛 key
  const key = pathSegment.join('/');

  if (!key) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const targetUrl = `${QINIU_ORIGIN}/${key}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // 转发部分请求头
        'User-Agent': request.headers.get('user-agent') || '',
        'Range': request.headers.get('range') || '',
      },
      // 不跟随重定向，避免循环
      redirect: 'manual',
    });

    // 处理重定向（301/302/307）
    if (response.status === 301 || response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      if (location) {
        return new NextResponse(null, {
          status: response.status,
          headers: { Location: location },
        });
      }
    }

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}`, key },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    };

    if (contentLength) headers['Content-Length'] = contentLength;
    if (contentRange) headers['Content-Range'] = contentRange;

    const buffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(buffer, {
      status: response.status,
      headers,
    });
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    return NextResponse.json(
      { error: 'Proxy failed', message: error.message, key },
      { status: 502 }
    );
  }
}
