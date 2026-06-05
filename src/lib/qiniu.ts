/**
 * 七牛云上传 + 删除工具
 * 纯 Node.js 实现，无需额外 SDK
 */

const crypto = require('crypto');

const QINIU_ACCESS_KEY = process.env.QINIU_ACCESS_KEY || '';
const QINIU_SECRET_KEY = process.env.QINIU_SECRET_KEY || '';
const QINIU_BUCKET = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab';
// QINIU_DOMAIN 不再使用，资源通过 /api/resource/ 代理访问
// const QINIU_DOMAIN = process.env.QINIU_DOMAIN || '';

/** Base64 URL Safe 编码（保留 padding） */
function urlSafeBase64(data: string | Buffer): string {
  return Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * 生成七牛云上传凭证 (uploadToken)
 */
export function generateUploadToken(key?: string, expiresSeconds = 3600): string {
  const deadline = Math.floor(Date.now() / 1000) + expiresSeconds;

  const putPolicy: Record<string, unknown> = {
    scope: key ? `${QINIU_BUCKET}:${key}` : QINIU_BUCKET,
    deadline,
  };

  const policyStr = JSON.stringify(putPolicy);
  const encodedPolicy = urlSafeBase64(policyStr);
  const hmacDigest = crypto.createHmac('sha1', QINIU_SECRET_KEY).update(encodedPolicy).digest();
  const encodedSign = urlSafeBase64(hmacDigest);

  return `${QINIU_ACCESS_KEY}:${encodedSign}:${encodedPolicy}`;
}

/**
 * 生成文件的公开访问 URL（统一走 /api/resource/ 代理）
 * 兼容新旧两种格式：
 * - key 为相对路径（如 videos/xxx.mp4）→ 转为 /api/resource/videos/xxx.mp4
 * - key 为旧全 URL（如 https://czbd.digit3ds.com/videos/xxx.mp4）→ 原样返回，由前端 normalizeUrl 处理
 */
export function getPublicUrl(key: string): string {
  if (key.startsWith('http')) {
    // 已经是完整 URL（旧数据），前端会自动规范化
    return key;
  }
  // 新格式：相对路径
  return `/api/resource/${key}`;
}

/**
 * 规范化资源 URL：将旧 CDN URL 转为代理路径
 * https://czbd.digit3ds.com/original-images/xxx.jpg → /api/resource/original-images/xxx.jpg
 * https://czbd.digit3ds.com/videos/xxx.mp4 → /api/resource/videos/xxx.mp4
 * /api/resource/xxx → /api/resource/xxx (不变)
 * https://xxx → https://xxx (其他外部 URL 不变)
 */
export function normalizeUrl(url: string): string {
  if (!url || !url.startsWith('http')) return url;

  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'czbd.digit3ds.com') {
      return '/api/resource/' + urlObj.pathname.replace(/^\//, '');
    }
  } catch {}

  return url;
}

/**
 * 生成七牛云管理凭证 (AccessToken) - 用于删除等管理操作
 */
export function generateManageToken(url: string, body?: string): string {
  const uri = new URL(url).pathname;
  const data = uri + '\n' + (body || '');
  const hmacDigest = crypto.createHmac('sha1', QINIU_SECRET_KEY).update(data).digest();
  const encodedSign = urlSafeBase64(hmacDigest);
  return `QBox ${QINIU_ACCESS_KEY}:${encodedSign}`;
}

/**
 * 删除七牛云单个文件
 * @param key 文件路径（如 "videos/xxx.mp4"）
 * @returns 是否成功
 */
export async function deleteQiniuFile(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const encodedKey = urlSafeBase64(key);
    const url = `https://rs.qiniu.com/delete/${encodedKey}`;
    const accessToken = generateManageToken(url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.ok) {
      return { success: true };
    }

    // 404 表示文件不存在，视为成功
    if (response.status === 404 || response.status === 612) {
      return { success: true };
    }

    const text = await response.text();
    return { success: false, error: `HTTP ${response.status}: ${text}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 批量删除七牛云文件
 * @param keys 文件路径数组
 * @returns 成功删除的数量和失败列表
 */
export async function deleteQiniuFiles(keys: string[]): Promise<{ deleted: number; failed: { key: string; error: string }[] }> {
  const deleted = 0;
  const failed: { key: string; error: string }[] = [];

  // 七牛批量删除接口，单次最多 1000 个
  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100);
    const ops = batch.map(key => `delete/${urlSafeBase64(key)}`);
    
    try {
      const url = 'https://rs.qiniu.com/batch';
      const body = ops.map(op => `op=${encodeURIComponent(op)}`).join('&');
      const accessToken = generateManageToken(url, body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': accessToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const result = await response.json();
      
      // result 是数组，每个元素对应一个操作的结果
      if (Array.isArray(result)) {
        result.forEach((item: any, idx: number) => {
          if (item.code !== 200 && item.code !== 404 && item.code !== 612) {
            failed.push({ key: batch[idx], error: `code ${item.code}` });
          }
        });
      }
    } catch (err: any) {
      batch.forEach(key => failed.push({ key, error: err.message }));
    }
  }

  return { deleted: keys.length - failed.length, failed };
}

/**
 * 构造七牛云文件路径
 */
export interface QiniuKeyParams {
  projectId: number;
  userId?: number;
  childName?: string;
  projectName?: string;
  styleId?: string;
}

/**
 * 生成 Qiniu CDN 公开访问 URL（无需签名，适合服务端 fetch）
 * 使用 Qiniu 公开bucket + CDN 域名直连
 */
export function getQiniuCdnUrl(key: string): string {
  const QINIU_CDN_ORIGIN = 'https://iovip-z0.qiniuio.com';
  return `${QINIU_CDN_ORIGIN}/${key}`;
}

export function getQiniuKey(
  format: 'video' | 'storyboard' | 'original',
  params: QiniuKeyParams | string,
  fileName?: string
): string {
  const folderMap = {
    video: 'videos',
    storyboard: 'generated-images',
    original: 'original-images',
  };
  const ext = (fileName?.split('.').pop()) || (format === 'video' ? 'mp4' : 'jpg');

  if (typeof params === 'string') {
    return `${folderMap[format]}/${params}-${Date.now()}.${ext}`;
  }

  const { projectId, userId = 0, childName = '', projectName = '', styleId = '' } = params;
  const suffix = format === 'video' ? '视频' : format === 'storyboard' ? '分镜图' : '';
  const baseName = `${projectId}_${userId}_${childName}_${projectName}_${styleId}`;
  return `${folderMap[format]}/${baseName}${suffix ? '_' + suffix : ''}.${ext}`;
}

/**
 * 从 URL 提取七牛 key
 * @param url 完整 URL 或相对路径
 */
export function extractQiniuKey(url: string): string | null {
  if (!url) return null;
  
  // 如果是完整 URL，提取路径部分
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.slice(1); // 去掉开头的 /
  } catch {
    // 不是完整 URL，直接返回
    if (url.startsWith('videos/') || url.startsWith('generated-images/') || url.startsWith('original-images/')) {
      return url;
    }
    return null;
  }
}
