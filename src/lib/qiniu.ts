/**
 * 七牛云上传凭证生成工具
 * 纯 Node.js 实现，无需额外 SDK
 */

const crypto = require('crypto');

const QINIU_ACCESS_KEY = process.env.QINIU_ACCESS_KEY || '';
const QINIU_SECRET_KEY = process.env.QINIU_SECRET_KEY || '';
const QINIU_BUCKET = process.env.QINIU_BUCKET || 'chengzhangbiaoda-lab';
const QINIU_DOMAIN = process.env.QINIU_DOMAIN || '';

/** Base64 URL Safe 编码（保留 padding） */
function urlSafeBase64(data: string | Buffer): string {
  return Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * 生成七牛云上传凭证 (uploadToken)
 * @param key 文件路径（如 "videos/xxx.mp4"），不传则允许任意 key
 * @param expiresSeconds 有效秒数，默认 3600（1小时）
 */
export function generateUploadToken(key?: string, expiresSeconds = 3600): string {
  const deadline = Math.floor(Date.now() / 1000) + expiresSeconds;

  const putPolicy: Record<string, unknown> = {
    scope: key ? `${QINIU_BUCKET}:${key}` : QINIU_BUCKET,
    deadline,
  };

  const policyStr = JSON.stringify(putPolicy);
  // 1. 对 JSON 做 Base64 URL Safe 编码
  const encodedPolicy = urlSafeBase64(policyStr);

  // 2. 用 HMAC-SHA1 对 encodedPolicy 签名
  const hmacDigest = crypto.createHmac('sha1', QINIU_SECRET_KEY).update(encodedPolicy).digest();

  // 3. 对签名做 Base64 URL Safe 编码
  const encodedSign = urlSafeBase64(hmacDigest);

  return `${QINIU_ACCESS_KEY}:${encodedSign}:${encodedPolicy}`;
}

/**
 * 生成文件的公开访问 URL
 * @param key 文件路径
 */
export function getPublicUrl(key: string): string {
  if (QINIU_DOMAIN) {
    return `${QINIU_DOMAIN}/${key}`;
  }
  return `https://${QINIU_BUCKET}.qiniucdn.com/${key}`;
}

/**
 * 根据 format 映射到七牛云文件夹路径
 */
export function getQiniuKey(format: 'video' | 'storyboard' | 'original', projectId: string, fileName: string): string {
  const folderMap = {
    video: 'videos',
    storyboard: 'generated-images',
    original: 'original-images',
  };
  const ext = fileName.split('.').pop() || (format === 'video' ? 'mp4' : 'jpg');
  return `${folderMap[format]}/${projectId}-${Date.now()}.${ext}`;
}
