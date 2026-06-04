/**
 * 将 UTC 时间字符串转换为北京时间显示
 * 数据库存储的是 UTC 时间（如 2026-06-02 03:36:59+00 或 2026-06-02T03:36:59Z）
 * 前端需要显示为北京时间（UTC+8）
 */
function toBeijingTime(utcString: string): Date | null {
  if (!utcString) return null;
  
  // 标准化时间字符串：确保带时区信息
  let normalized = utcString.trim();
  
  // 如果已经是 ISO 格式带 Z，直接用
  if (normalized.endsWith('Z')) {
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getTime() + 8 * 60 * 60 * 1000);
  }
  
  // 如果带 +00 或 +00:00 时区，直接用
  if (/[+-]\d{2}:?\d{2}$/.test(normalized)) {
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getTime() + 8 * 60 * 60 * 1000);
  }
  
  // 无时区的情况（如 2026-06-02 03:36:59 或 2026-06-02T03:36:59）
  // 假设这是 UTC 时间，手动添加 Z 再解析
  if (!normalized.includes('Z') && !/[+-]\d{2}/.test(normalized)) {
    // 将空格替换为 T，确保是 ISO 格式
    normalized = normalized.replace(' ', 'T');
    // 添加 UTC 时区标记
    if (!normalized.endsWith('Z')) {
      normalized += 'Z';
    }
  }
  
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return null;
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}

export function formatDateTime(utcString: string): string {
  const beijingTime = toBeijingTime(utcString);
  if (!beijingTime) return '-';
  
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
  const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDate(utcString: string): string {
  const beijingTime = toBeijingTime(utcString);
  if (!beijingTime) return '-';
  
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
