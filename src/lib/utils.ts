/**
 * 将 UTC 时间字符串转换为北京时间显示
 * 数据库存储的是 UTC 时间（如 2026-06-02 03:36:59+00）
 * 前端需要显示为北京时间（UTC+8）
 */
function toBeijingTime(utcString: string): Date | null {
  if (!utcString) return null;
  const date = new Date(utcString);
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
